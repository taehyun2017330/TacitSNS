import React, { useEffect, useRef, useState } from 'react';

type EditableTag = 'div' | 'p' | 'h4';

interface Props {
  as?: EditableTag;
  value: string;
  placeholder: string;
  className?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}

const InlineEditableText: React.FC<Props> = ({
  as = 'div',
  value,
  placeholder,
  className = '',
  multiline = true,
  onChange
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isFocused) {
      return;
    }

    if (element.innerText !== value) {
      element.innerText = value;
    }
  }, [isFocused, value]);

  const handleInput = () => {
    const nextValue = ref.current?.innerText.replace(/\u00a0/g, ' ') ?? '';
    onChange(multiline ? nextValue : nextValue.replace(/\n/g, ' '));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      ref.current?.blur();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (ref.current) {
        ref.current.innerText = value;
        ref.current.blur();
      }
    }
  };

  const sharedProps = {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    role: 'textbox',
    'aria-multiline': multiline,
    'data-placeholder': placeholder,
    className: `${className} inline-editable${value.trim() ? '' : ' is-empty'}`.trim(),
    onInput: handleInput,
    onMouseDown: (event: React.MouseEvent<HTMLElement>) => event.stopPropagation(),
    onClick: (event: React.MouseEvent<HTMLElement>) => event.stopPropagation(),
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onKeyDown: handleKeyDown
  };

  if (as === 'h4') {
    return <h4 {...sharedProps} />;
  }

  if (as === 'p') {
    return <p {...sharedProps} />;
  }

  return <div {...sharedProps} />;
};

export default InlineEditableText;
