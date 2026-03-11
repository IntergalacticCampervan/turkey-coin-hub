import { ChevronLeft, ChevronRight, Sparkles, Swords } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

import { NOMINATION_REWARD_OPTIONS } from '../../lib/nominationRewards';
import type { LeaderboardEntry } from '../lib/types';
import { postNomination } from '../lib/api';
import { shortWallet, normalizeWallet } from '../lib/nominationUi';
import { DataPanel, StatusBadge, TerminalText } from './TerminalPrimitives';

const LORE_MODES = [
  {
    id: 'ship-saver',
    label: 'SHIP SAVER',
    prompt: 'What actual work did they do, and why did it help the flock?',
    defaultReason: 'Shipped a real fix at the exact moment the turkeyverse needed one and spared the flock from operational embarrassment.',
  },
  {
    id: 'coop-support',
    label: 'COOP SUPPORT',
    prompt: 'What support, collaboration, or unblock did they deliver?',
    defaultReason: 'Unblocked the crew with elite support energy and kept the coop moving like a haunted but efficient assembly line.',
  },
  {
    id: 'lorequake',
    label: 'LOREQUAKE',
    prompt: 'What result changed the project enough to enter turkey legend?',
    defaultReason: 'Delivered visible impact so potent the gobble elders had to log it in the official project prophecy ledger.',
  },
];

type WizardStep = 0 | 1 | 2 | 3;

export function NewNominationWizard({ roster }: { roster: LeaderboardEntry[] }) {
  const navigate = useNavigate();
  const { address } = useAccount();
  const currentWallet = normalizeWallet(address);
  const [step, setStep] = useState<WizardStep>(0);
  const [selectedNomineeWallet, setSelectedNomineeWallet] = useState('');
  const [selectedRewardId, setSelectedRewardId] = useState(NOMINATION_REWARD_OPTIONS[0]?.id ?? '');
  const [selectedLoreModeId, setSelectedLoreModeId] = useState(LORE_MODES[0]?.id ?? '');
  const [loreNotes, setLoreNotes] = useState(LORE_MODES[0]?.defaultReason ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carouselDirection, setCarouselDirection] = useState<1 | -1>(1);

  const selectableRoster = useMemo(
    () => roster.filter((row) => normalizeWallet(row.walletAddress) !== currentWallet),
    [currentWallet, roster],
  );
  const selectedNominee = useMemo(
    () => selectableRoster.find((row) => row.walletAddress === selectedNomineeWallet) ?? selectableRoster[0] ?? null,
    [selectableRoster, selectedNomineeWallet],
  );
  const selectedNomineeIndex = useMemo(
    () => selectableRoster.findIndex((row) => row.walletAddress === selectedNominee?.walletAddress),
    [selectableRoster, selectedNominee],
  );
  const selectedReward = useMemo(
    () => NOMINATION_REWARD_OPTIONS.find((reward) => reward.id === selectedRewardId) ?? NOMINATION_REWARD_OPTIONS[0],
    [selectedRewardId],
  );
  const selectedLoreMode = useMemo(
    () => LORE_MODES.find((mode) => mode.id === selectedLoreModeId) ?? LORE_MODES[0],
    [selectedLoreModeId],
  );

  useEffect(() => {
    if (!selectedNomineeWallet && selectableRoster[0]) {
      setSelectedNomineeWallet(selectableRoster[0].walletAddress);
    }
  }, [selectableRoster, selectedNomineeWallet]);

  useEffect(() => {
    setLoreNotes(selectedLoreMode.defaultReason);
  }, [selectedLoreMode]);

  function cycleNominee(direction: -1 | 1) {
    if (selectableRoster.length === 0) {
      return;
    }

    setCarouselDirection(direction);
    const currentIndex = selectedNomineeIndex >= 0 ? selectedNomineeIndex : 0;
    const nextIndex = (currentIndex + direction + selectableRoster.length) % selectableRoster.length;
    setSelectedNomineeWallet(selectableRoster[nextIndex]?.walletAddress ?? '');
  }

  async function submitNomination() {
    if (!currentWallet) {
      setError('Connect the enrolled wallet before launching a nomination.');
      return;
    }

    if (!selectedNominee) {
      setError('Choose a fellow turkey fighter first.');
      return;
    }

    if (loreNotes.trim().length < 12) {
      setError('Lore briefing is too flimsy. Give the tribunal some material.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await postNomination({
        nomineeWalletAddress: selectedNominee.walletAddress,
        nominatorWalletAddress: currentWallet,
        rewardId: selectedReward.id,
        reason: loreNotes.trim(),
      });

      if (!result.ok || !result.data?.ok) {
        setError(result.error || result.data?.error || 'Nomination launch failed');
        return;
      }

      navigate('/nominations', {
        replace: true,
      });
    } finally {
      setBusy(false);
    }
  }

  const steps = ['FIGHTER', 'REWARD', 'LORE', 'REVIEW'] as const;

  return (
    <div className="view-grid">
      <div className="view-header">
        <div>
          <h1 className="view-title">NEW NOMINATION</h1>
          <TerminalText as="p" className="muted-text">
            Full-screen tribunal flow. Complete the steps, then return to the board pending a second approval.
          </TerminalText>
        </div>
        <Link to="/nominations" className="nomination-route-btn">
          BACK TO NOMINATIONS
        </Link>
      </div>

      <DataPanel title="[ NOMINATION STEPPER ]" status="active" className="nomination-arcade-panel">
        <div className="wizard-stepper">
          {steps.map((label, index) => (
            <div key={label} className={`wizard-step ${index === step ? 'active' : index < step ? 'done' : ''}`}>
              <span>{index + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        {step === 0 ? (
          <section className="nomination-fighter-bay full-width">
            <div className="fighter-bay-header">
              <TerminalText className="metric-label">STEP 1: CHOOSE THE GOBBLER</TerminalText>
              <span className="fighter-bay-kicker">INSERT COIN OF MERIT</span>
            </div>
            {selectedNominee ? (
              <div className="fighter-carousel">
                <button type="button" className="fighter-carousel-btn" onClick={() => cycleNominee(-1)} aria-label="Previous fighter">
                  <ChevronLeft size={20} />
                </button>
                <div className="fighter-stage">
                  <div className="fighter-stage-viewport">
                    <AnimatePresence mode="wait" custom={carouselDirection}>
                      <motion.div
                        key={selectedNominee.walletAddress}
                        className="fighter-stage-frame"
                        custom={carouselDirection}
                        initial={{ x: carouselDirection > 0 ? 56 : -56, opacity: 0, scale: 0.985 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: carouselDirection > 0 ? -56 : 56, opacity: 0, scale: 0.985 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="fighter-stage-rank">FIGHTER #{selectedNomineeIndex + 1}</div>
                        <img src="/Turkeycoin.svg" alt="" aria-hidden="true" className="fighter-stage-coin" />
                        <div className="fighter-stage-name">@{selectedNominee.handle}</div>
                        <div className="fighter-stage-wallet">{shortWallet(selectedNominee.walletAddress)}</div>
                        <div className="fighter-stage-score">{selectedNominee.balance} TC POWER</div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <TerminalText className="muted-text fighter-stage-caption">
                    {selectedNomineeIndex + 1} / {selectableRoster.length} gobblers ready for tribunal selection
                  </TerminalText>
                </div>
                <button type="button" className="fighter-carousel-btn" onClick={() => cycleNominee(1)} aria-label="Next fighter">
                  <ChevronRight size={20} />
                </button>
              </div>
            ) : (
              <p className="warning-text">More onboarded crew members are required before the tribunal can begin.</p>
            )}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="launchpad-card">
            <TerminalText className="metric-label">STEP 2: PICK THE REWARD TIER</TerminalText>
            <div className="reward-loadout-grid">
              {NOMINATION_REWARD_OPTIONS.map((reward) => (
                <button
                  key={reward.id}
                  type="button"
                  className={`reward-card ${selectedReward.id === reward.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRewardId(reward.id)}
                >
                  <span className="reward-card-title">{reward.label}</span>
                  <span className="reward-card-amount">{reward.amount} TC</span>
                  <span className="reward-card-copy">{reward.announcerLine}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="launchpad-card">
            <TerminalText className="metric-label">STEP 3: WRITE THE WORK LORE</TerminalText>
            <div className="lore-mode-grid">
              {LORE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`lore-mode-chip ${selectedLoreMode.id === mode.id ? 'selected' : ''}`}
                  onClick={() => setSelectedLoreModeId(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <label className="nomination-textarea-wrap">
              <span className="nomination-field-label">{selectedLoreMode.prompt}</span>
              <textarea
                value={loreNotes}
                onChange={(event) => setLoreNotes(event.target.value.slice(0, 180))}
                className="nomination-textarea"
                rows={6}
                maxLength={180}
              />
            </label>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="launchpad-card">
            <TerminalText className="metric-label">STEP 4: REVIEW THE CASE</TerminalText>
            <div className="wizard-review-grid">
              <div className="tribunal-meta-chip">NOMINEE: @{selectedNominee?.handle ?? '???'}</div>
              <div className="tribunal-meta-chip">REWARD: {selectedReward.amount} TC</div>
              <div className="tribunal-meta-chip">TIER: {selectedReward.label}</div>
            </div>
            <div className="tribunal-callout">
              <TerminalText className="tribunal-callout-title">NOMINATION SUMMARY</TerminalText>
              <p className="tribunal-callout-copy">{loreNotes}</p>
            </div>
            <div className="nomination-preview-copy">
              <Swords size={16} />
              <span>
                Submission returns you to the board where this case will wait for a second approval.
              </span>
            </div>
          </section>
        ) : null}

        <div className="wizard-controls">
          <button type="button" className="source-connect-btn secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1) as WizardStep)}>
            PREVIOUS STEP
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="nomination-route-btn large"
              disabled={(step === 0 && !selectedNominee) || (step === 2 && loreNotes.trim().length < 12)}
              onClick={() => setStep((value) => Math.min(3, value + 1) as WizardStep)}
            >
              NEXT STEP
            </button>
          ) : (
            <button type="button" className="nomination-route-btn large" disabled={busy || !selectedNominee} onClick={submitNomination}>
              {busy ? 'TRANSMITTING...' : 'SUBMIT NOMINATION'}
            </button>
          )}
        </div>
      </DataPanel>
    </div>
  );
}
