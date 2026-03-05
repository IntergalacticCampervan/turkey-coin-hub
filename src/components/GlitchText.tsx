import type { CSSProperties, FC } from 'react';

interface GlitchTextProps {
  children: string;
  speed?: number;
  enableShadows?: boolean;
  enableOnHover?: boolean;
  as?: 'span' | 'div';
  className?: string;
}

interface CustomCSSProperties extends CSSProperties {
  '--glitch-duration-a': string;
  '--glitch-duration-b': string;
  '--glitch-shadow-a': string;
  '--glitch-shadow-b': string;
}

const GlitchText: FC<GlitchTextProps> = ({
  children,
  speed = 0.65,
  enableShadows = true,
  enableOnHover = false,
  as = 'span',
  className = ''
}) => {
  const inlineStyles: CustomCSSProperties = {
    '--glitch-duration-a': `${speed * 2.8}s`,
    '--glitch-duration-b': `${speed * 1.95}s`,
    '--glitch-shadow-a': enableShadows ? '-1px 0 #ff3d3d' : 'none',
    '--glitch-shadow-b': enableShadows ? '1px 0 #2af6e9' : 'none',
  };

  const classes = ['glitch-text', enableOnHover ? 'on-hover' : 'always', className].filter(Boolean).join(' ');
  const Tag = as;

  return (
    <Tag className={classes} style={inlineStyles} data-text={children}>
      {children}
    </Tag>
  );
};

export default GlitchText;
