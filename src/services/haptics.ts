// Old name kept so existing screens keep working; everything now goes through feel.ts (settings respected).
import { feel } from './feel';

export const haptic = {
  chop: () => feel.chop(false),
  crit: () => feel.chop(true),
  success: () => feel.purchase(),
  error: () => feel.error(),
};
