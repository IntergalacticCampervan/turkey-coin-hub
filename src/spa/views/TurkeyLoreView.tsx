import { BookOpenText, Crown, ScrollText, Sparkles } from 'lucide-react';

import DecryptedText from '../../components/DecryptedText';
import { DataPanel, StatusBadge, TerminalText } from '../components/TerminalPrimitives';

const REWARD_TIERS = [
  {
    tier: 'Tier I',
    name: 'Egg of Minor Service',
    reward: '1 TC',
    meaning: 'Small but honorable acts',
    examples: ['Answering a quick question', 'Posting a useful link', 'Saving someone 3 minutes of confusion'],
  },
  {
    tier: 'Tier II',
    name: 'Feather of Contribution',
    reward: '5 TC',
    meaning: 'Modest but visible effort',
    examples: ['Helping unblock someone', 'Fixing a small issue', 'Moving a discussion forward'],
  },
  {
    tier: 'Tier III',
    name: 'Gobble of Leadership',
    reward: '10 TC',
    meaning: 'Leading standup or coordination',
    examples: ['Leading the daily standup', 'Coordinating a small task', 'Preventing meeting chaos'],
  },
  {
    tier: 'Tier IV',
    name: 'Golden Drumstick',
    reward: '25 TC',
    meaning: 'Significant team help',
    examples: ['Solving a tricky problem', 'Shipping something meaningful', 'Unblocking multiple people'],
  },
  {
    tier: 'Tier V',
    name: 'Legendary Roast',
    reward: '100 TC',
    meaning: 'Rare heroic deeds',
    examples: ['Heroic debugging at the edge of madness', 'Fixing the impossible problem', 'Saving a release'],
  },
] as const;

export function TurkeyLoreView() {
  return (
    <div className="view-grid lore-view">
      <div className="view-header">
        <div>
          <h1 className="view-title admin-title">
            <BookOpenText size={26} />
            <DecryptedText text="TURKEY LORE ARCHIVE" animateOn="view" sequential speed={36} />
          </h1>
          <TerminalText as="p" className="muted-text">
            Feathered doctrine as preserved by the Galactic Turkey Emperor
          </TerminalText>
        </div>
        <StatusBadge status="online">CANONICAL</StatusBadge>
      </div>

      <DataPanel status="active" className="lore-hero-panel">
        <div className="lore-hero">
          <div className="lore-hero-copy">
            <TerminalText className="lore-kicker">As decreed by the High Throne of the Galactic Turkey Emperor</TerminalText>
            <TerminalText className="panel-heading glow">TURKEY COIN REWARD DOCTRINE</TerminalText>
            <TerminalText as="p" className="muted-text">
              In the early cycles, wild minting nearly collapsed the sacred poultry economy. The High Throne answered
              with fixed reward tiers so noble deeds could be judged without triggering another inflationary barn fire.
            </TerminalText>
          </div>
          <div className="lore-hero-seal" aria-hidden="true">
            <Crown size={28} />
            <span>BOOK OF GOBBLES</span>
          </div>
        </div>
        <div className="lore-command-strip" aria-label="Imperial decree summary">
          <div className="lore-command-item">
            <span className="lore-command-label">Mint Floor</span>
            <span className="lore-command-value">1 TC</span>
          </div>
          <div className="lore-command-item">
            <span className="lore-command-label">Heroic Ceiling</span>
            <span className="lore-command-value">100 TC</span>
          </div>
          <div className="lore-command-item">
            <span className="lore-command-label">Forbidden Zone</span>
            <span className="lore-command-value">99,999+</span>
          </div>
        </div>
      </DataPanel>

      <div className="lore-tier-grid">
        {REWARD_TIERS.map((tier) => (
          <DataPanel key={tier.tier} status="idle" className="lore-tier-card">
            <div className="lore-tier-head">
              <TerminalText className="lore-tier-label">{tier.tier}</TerminalText>
              <TerminalText className="lore-tier-reward glow">{tier.reward}</TerminalText>
            </div>
            <h2 className="lore-tier-title">{tier.name}</h2>
            <TerminalText as="p" className="muted-text">
              {tier.meaning}
            </TerminalText>
            <div className="lore-example-list">
              {tier.examples.map((example) => (
                <TerminalText key={example} as="p" className="lore-example-item">
                  {example}
                </TerminalText>
              ))}
            </div>
          </DataPanel>
        ))}
      </div>

      <DataPanel title="[ FORBIDDEN KNOWLEDGE ]" status="alert" className="warning-panel lore-warning-panel">
        <div className="warning-row">
          <ScrollText size={18} />
          <div>
            <TerminalText className="terminal-text glow">GREAT INFLATION OF THE THIRD FLOCK</TerminalText>
            <TerminalText as="p" className="muted-text">
              Absurd minting quantities such as 99,999 or 500,000 are condemned by imperial decree. One intern was
              briefly crowned the richest bird in the galaxy. The realm has not forgotten.
            </TerminalText>
          </div>
        </div>
      </DataPanel>

      <DataPanel status="active" className="lore-closing-panel">
        <div className="lore-closing">
          <Sparkles size={18} className="accent-icon" />
          <TerminalText as="p">
            All hail the Turkey Emperor. May your gobbles be prosperous, your standups brief, and your rewards
            properly tiered.
          </TerminalText>
        </div>
      </DataPanel>
    </div>
  );
}
