export type NominationRewardOption = {
  id: string;
  label: string;
  amount: string;
  announcerLine: string;
};

export const NOMINATION_REWARD_OPTIONS: NominationRewardOption[] = [
  {
    id: 'half-drumstick',
    label: 'HALF DRUMSTICK',
    amount: '0.5',
    announcerLine: 'For a crisp, real contribution that deserves a tiny ceremonial gobble.',
  },
  {
    id: 'full-feast',
    label: 'FULL FEAST',
    amount: '1',
    announcerLine: 'For meaningful work that improved the coop without setting it on fire.',
  },
  {
    id: 'gobbler-bonus-round',
    label: 'GOBBLER BONUS ROUND',
    amount: '5',
    announcerLine: 'For major impact, improbable heroics, or work so strong the flock had to salute.',
  },
];

export function getNominationRewardOptionById(rewardId: string): NominationRewardOption | null {
  return NOMINATION_REWARD_OPTIONS.find((reward) => reward.id === rewardId) ?? null;
}
