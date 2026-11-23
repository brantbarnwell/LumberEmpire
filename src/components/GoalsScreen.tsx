import { adReady } from '../services/ads';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { feel } from '../services/feel';
import { Icon } from './art/Icons';
import { showToast } from './Celebrate';
import { LinearGradient } from 'expo-linear-gradient';
import { update, useGame } from '../game/store';
import { rushInfo } from '../game/logic';
import {
  adBoostLeftMs, adFree, canAdBoost, canClaimLogin, canPrestige, claimLogin, loginIndexNow, claimQuest, dailyQuestMoney, doPrestige,
  goldVideosLeft, loginRewardText, prestigeGain, prestigePreview, prestigeProgress, weeklyBoard, questLabel, questProgress, rewardAdBoost, rewardGoldVideo,
} from '../game/meta';
import {
  AD_BOOST_MINUTES, AD_GOLD_PER_VIDEO, AD_GOLD_VIDEOS_PER_DAY, DAILY_QUEST_GOLD, DAILY_REWARDS, PRESTIGE_AT, PRESTIGE_NAME,
  WEEKLY_QUEST_GOLD, WOOD_NAMES,
} from '../game/data';
import { duration, money, small, whole } from '../game/format';
import { haptic } from '../services/haptics';
import { runReward } from './reward';
import { showPopup } from './popup';
import { Button, Card, ProgressBar } from './ui';
import { C } from './theme';

function useNow() {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return n;
}

export function GoalsScreen() {
  const s = useGame();
  const now = useNow();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmPrestige, setConfirmPrestige] = useState(false);
  const rush = rushInfo(s, now);
  const free = adFree(s);
  const claimable = canClaimLogin(s, now);

  const reward = async (key: string, apply: Parameters<typeof runReward>[0]) => {
    setMsg(null);
    setBusy(key);
    const err = await runReward(apply);
    setBusy(null);
    if (err) setMsg(err);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>

      {/* Timber Rush */}
      <LinearGradient colors={rush.active ? ['#c2571a', '#e8892c'] : ['#3d5a46', '#4f7a5c']} style={styles.rush}>
        <Text style={styles.rushTitle}>Timber Rush{rush.active ? ' is ON' : ''}</Text>
        <Text style={styles.rushText}>
          {rush.active
            ? `1.5x from your ${WOOD_NAMES[rush.type]} forests and a special order board in the Market · ${duration(rush.endsAt - now)} left`
            : `Every weekend (48 hours): 1.5x from one wood type's forests plus a limited order board. Starts in ${duration(rush.startsAt - now)}.`}
        </Text>
      </LinearGradient>

      {msg && <View style={styles.msg}><Text style={styles.msgText}>{msg}</Text></View>}

      {/* Daily rewards */}
      <Card>
        <Text style={styles.h}>Daily rewards</Text>
        <Text style={styles.sub}>Miss one day: no problem. Miss more: you only drop back one day, never to Day 1.</Text>
        <View style={styles.days}>
          {DAILY_REWARDS.map((r, i) => {
            const idx = loginIndexNow(s, now);
            const done = i < idx || (!claimable && i === idx - 1);
            const today = claimable && i === idx;
            const tomorrow = claimable ? i === (idx + 1) % 7 : i === idx % 7;
            return (
              <View key={i} style={[styles.day, r.big && styles.dayBig, done && styles.dayDone, today && styles.dayToday]}>
                <Text style={styles.dayNum}>{today ? 'Today' : tomorrow ? 'Tomorrow' : `Day ${i + 1}`}</Text>
                <View style={{ height: 24, justifyContent: 'center' }}><Icon name={r.big || r.gold ? 'gold' : r.boostMin ? 'wps' : 'money'} size={r.big ? 24 : 20} /></View>
                <Text style={styles.dayText} numberOfLines={3}>{loginRewardText(s, i, now)}</Text>
                {done && <Text style={styles.check}>✓</Text>}
              </View>
            );
          })}
        </View>
        <Button
          style={{ marginTop: 10 }}
          variant="gold"
          label={claimable ? `Claim Day ${loginIndexNow(s, now) + 1}` : 'Come back tomorrow'}
          disabled={!claimable}
          onPress={() => {
            const day = loginIndexNow(s, Date.now());
            const text = loginRewardText(s, day, Date.now());
            if (update((st) => claimLogin(st, Date.now()))) {
              feel.reward();
              showToast({ kind: `DAY ${day + 1} REWARD`, title: text, icon: 'gold' });
            }
          }}
        />
      </Card>

      {/* Free rewards (Playbook 3: only when a video can actually play) */}
      {(free || adReady()) && <Card>
        <Text style={styles.h}>Free rewards</Text>
        <Text style={styles.sub}>{free ? 'You are ad-free: these are instant, no video.' : 'Optional. Watch a short video only if you want to.'}</Text>
        <View style={styles.freeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>+{AD_GOLD_PER_VIDEO} Gold</Text>
            <Text style={styles.small}>{goldVideosLeft(s, now)}/{AD_GOLD_VIDEOS_PER_DAY} left today</Text>
          </View>
          <Button
            small
            label={free ? 'Claim' : '▶ Watch'}
            loading={busy === 'gold'}
            disabled={!!busy || goldVideosLeft(s, now) === 0}
            onPress={() => reward('gold', (st) => rewardGoldVideo(st, Date.now()))}
          />
        </View>
        <View style={styles.freeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>2x production for {AD_BOOST_MINUTES / 60} hour</Text>
            <Text style={styles.small}>{adBoostLeftMs(s, now) > 0 ? `Active: ${duration(adBoostLeftMs(s, now))} left. Another adds 1 hour (max 6h), never more than 2x` : 'Chopping, helpers and land'}</Text>
          </View>
          <Button
            small
            label={free ? 'Claim' : '▶ Watch'}
            loading={busy === 'boost'}
            disabled={!!busy || !canAdBoost(s, now)}
            onPress={() => reward('boost', (st) => rewardAdBoost(st, Date.now()))}
          />
        </View>
      </Card>}

      {/* Quests */}
      <Card>
        <Text style={styles.h}>Daily quests</Text>
        <Text style={styles.sub}>Each gives {DAILY_QUEST_GOLD} Gold + {money(dailyQuestMoney(s, now))}. New ones tomorrow.</Text>
        {s.daily.quests.map((q, i) => (
          <QuestRow key={q.id} label={questLabel(q)} progress={questProgress(s, q)} target={q.target} claimed={q.claimed}
            onClaim={() => update((st) => claimQuest(st, i, Date.now())) && feel.reward()} money={q.id === 'earn'} />
        ))}
      </Card>
      {s.weekly.quest && (
        <Card>
          <Text style={styles.h}>Weekly quest</Text>
          <Text style={styles.sub}>Reward: {WEEKLY_QUEST_GOLD} Gold + 2 hours of 2x wood + 1 hour of income. Resets Monday.</Text>
          <QuestRow label={questLabel(s.weekly.quest)} progress={questProgress(s, s.weekly.quest)} target={s.weekly.quest.target}
            claimed={s.weekly.quest.claimed} onClaim={() => update((st) => claimQuest(st, 'weekly', Date.now())) && feel.reward()}
            money={s.weekly.quest.id === 'wearn'} />
        </Card>
      )}

      {/* Weekly leaderboard (update 3) */}
      <Card>
        <Text style={styles.h}>Weekly leaderboard</Text>
        <Text style={styles.sub}>Money earned this week against the rival companies. Resets Monday.</Text>
        {weeklyBoard(s, now).map((r, i) => (
          <View key={r.name} style={[styles.boardRow, r.you && styles.boardYou]}>
            <Text style={styles.boardRank}>{i + 1}</Text>
            <Text style={[styles.boardName, r.you && { color: C.leaf }]} numberOfLines={1}>{i === 0 ? '👑 ' : ''}{r.name}</Text>
            <Text style={styles.boardMoney}>{money(r.earned)}</Text>
          </View>
        ))}
      </Card>

      {/* Prestige */}
      <LinearGradient colors={['#2b1d10', '#5a3a1c']} style={styles.prestige}>
        <Text style={styles.pTitle}>Become a {PRESTIGE_NAME}</Text>
        <Text style={styles.pText}>
          Earn {money(PRESTIGE_AT)} in one run to start over with faster wood for good, plus 20 Gold.
          {s.prestige.count > 0 ? ` You are ${PRESTIGE_NAME} x${s.prestige.count}: all wood ${small(s.prestige.mult)}x faster.` : ''}
        </Text>
        <View style={{ marginVertical: 8 }}><ProgressBar value={prestigeProgress(s)} color={C.gold} height={10} /></View>
        <Text style={styles.pText}>{money(s.runMoneyEarned)} / {money(PRESTIGE_AT)} earned this run</Text>
        {canPrestige(s) && (() => {
          const pv = prestigePreview(s, Date.now());
          return (
            <View style={styles.preview}>
              <Text style={styles.previewBig}>Reset now for +{pv.pct}% forever.</Text>
              {pv.minutes !== null && <Text style={styles.previewText}>You will re-earn today's progress in about {pv.minutes < 120 ? `${pv.minutes} minutes` : `${Math.round(pv.minutes / 60)} hours`}.</Text>}
              <Text style={styles.previewKeep}>Kept: Gold, skins, VIP, purchases, Gold-bought Golden Chainsaw, Empire Pack Sawmill level 1.</Text>
            </View>
          );
        })()}
        {canPrestige(s) && (
          !confirmPrestige ? (
            <Button style={{ marginTop: 10 }} variant="gold" label={`Prestige: wood ${small(s.prestige.mult + prestigeGain(s))}x faster`} onPress={() => setConfirmPrestige(true)} />
          ) : (
            <View style={{ gap: 6, marginTop: 10 }}>
              <Text style={styles.pWarn}>You will lose your Money, wood, axe, tools, helpers, land and workshop. You keep Gold, purchases, VIP, streaks, quests, and a Golden Chainsaw bought with Gold. Wood is {small(s.prestige.mult + prestigeGain(s))}x faster forever.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button style={{ flex: 1 }} variant="gold" label="Yes, prestige" onPress={() => {
                  if (update((st) => doPrestige(st, Date.now()))) {
                    feel.prestige();
                    showToast({ kind: 'PRESTIGE!', title: `You are a ${PRESTIGE_NAME}!`, sub: 'Wood is faster forever', icon: 'gold' });
                  }
                  setConfirmPrestige(false);
                }} />
                <Button style={{ flex: 1 }} variant="ghost" label="Not yet" onPress={() => setConfirmPrestige(false)} />
              </View>
            </View>
          )
        )}
      </LinearGradient>
    </ScrollView>
  );
}

function QuestRow({ label, progress, target, claimed, onClaim, money: isMoney }: {
  label: string; progress: number; target: number; claimed: boolean; onClaim: () => void; money?: boolean;
}) {
  const done = progress >= target;
  return (
    <View style={styles.quest}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.name, claimed && { color: C.inkSoft, textDecorationLine: 'line-through' }]}>{label}</Text>
        <ProgressBar value={progress / target} color={done ? C.leafLight : C.gold} height={7} />
        <Text style={styles.small}>{isMoney ? `${money(progress)} / ${money(target)}` : `${whole(progress)} / ${whole(target)}`}</Text>
      </View>
      {claimed ? <Text style={styles.claimed}>Done ✓</Text> : <Button small label="Claim" disabled={!done} onPress={onClaim} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  content: { padding: 14, gap: 10, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  h: { fontSize: 17, fontWeight: '900', color: C.ink },
  name: { fontSize: 14, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, fontWeight: '700', color: C.inkSoft, marginTop: 2 },
  small: { fontSize: 11, fontWeight: '700', color: C.inkSoft },
  rush: { borderRadius: 16, padding: 14 },
  rushTitle: { color: '#fff', fontWeight: '900', fontSize: 17 },
  rushText: { color: '#fff3e0', fontWeight: '700', fontSize: 12.5, marginTop: 3 },
  msg: { backgroundColor: '#e8e3d6', borderRadius: 12, padding: 10 },
  msgText: { fontWeight: '800', color: C.ink, fontSize: 13 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  day: { width: '22.5%', flexGrow: 1, borderRadius: 12, backgroundColor: '#efe2c4', padding: 6, alignItems: 'center', minHeight: 86 },
  dayBig: { width: '47%', backgroundColor: '#ffe7a3', borderWidth: 2, borderColor: C.gold },
  dayDone: { opacity: 0.5 },
  dayToday: { borderWidth: 2, borderColor: C.leafLight },
  dayNum: { fontSize: 11, fontWeight: '900', color: C.inkSoft },
  dayIcon: { fontSize: 22, marginVertical: 2 },
  dayText: { fontSize: 10.5, fontWeight: '800', color: C.ink, textAlign: 'center' },
  check: { position: 'absolute', top: 4, right: 6, color: C.leaf, fontWeight: '900' },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  claimed: { color: C.leaf, fontWeight: '900' },
  prestige: { borderRadius: 16, padding: 14 },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 10, marginTop: 4 },
  boardYou: { backgroundColor: 'rgba(79,154,79,0.14)' },
  boardRank: { width: 20, fontSize: 15, fontWeight: '900', color: C.inkSoft, textAlign: 'center' },
  boardName: { flex: 1, fontSize: 15, fontWeight: '900', color: C.ink },
  boardMoney: { fontSize: 15, fontWeight: '900', color: C.money },
  preview: { backgroundColor: 'rgba(245,197,66,0.15)', borderRadius: 12, padding: 10, marginTop: 8, borderWidth: 1.5, borderColor: 'rgba(245,197,66,0.6)' },
  previewBig: { color: '#ffe17a', fontSize: 18, fontWeight: '900' },
  previewText: { color: '#fff6dc', fontSize: 13.5, fontWeight: '800', marginTop: 2 },
  previewKeep: { color: '#e9d9b6', fontSize: 11.5, fontWeight: '700', marginTop: 6 },
  pTitle: { color: C.gold, fontWeight: '900', fontSize: 18 },
  pText: { color: '#f3e3c3', fontWeight: '700', fontSize: 12.5, marginTop: 3 },
  pWarn: { color: '#ffd9c2', fontWeight: '800', fontSize: 12.5 },
});
