import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dismissPopup, usePopup } from './popup';
import { Button } from './ui';
import { C, shadow } from './theme';

export function PopupView() {
  const p = usePopup();
  if (!p) return null;
  return (
    <Pressable style={styles.back} onPress={dismissPopup}>
      <View style={styles.card}>
        <Text style={styles.icon}>{p.icon}</Text>
        <Text style={styles.title}>{p.title}</Text>
        {p.body ? <Text style={styles.body}>{p.body}</Text> : null}
        <Button label="Nice!" onPress={dismissPopup} style={{ alignSelf: 'stretch', marginTop: 12 }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,20,12,0.55)', alignItems: 'center', justifyContent: 'center', padding: 30, zIndex: 50 },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 22, alignItems: 'center', width: '100%', maxWidth: 360, borderWidth: 3, borderColor: C.gold, ...shadow },
  icon: { fontSize: 54 },
  title: { fontSize: 21, fontWeight: '900', color: C.ink, textAlign: 'center', marginTop: 6 },
  body: { fontSize: 14, fontWeight: '700', color: C.inkSoft, textAlign: 'center', marginTop: 6 },
});
