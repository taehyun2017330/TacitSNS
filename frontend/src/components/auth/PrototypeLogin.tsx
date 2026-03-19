import React, { useMemo, useState } from 'react';

import type { PrototypeUser } from '../../types/workspace';

interface Props {
  onLogin: (user: PrototypeUser) => void;
}

function buildDisplayName(name: string, email: string) {
  const trimmedName = name.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = email.split('@')[0]?.trim();
  if (emailPrefix) {
    return emailPrefix
      .split(/[._-]/)
      .filter(Boolean)
      .map(chunk => chunk[0]?.toUpperCase() + chunk.slice(1))
      .join(' ');
  }

  return 'Prototype User';
}

const PrototypeLogin: React.FC<Props> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canContinue = useMemo(
    () => Boolean(name.trim() || email.trim() || password.trim()),
    [email, name, password]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canContinue) {
      return;
    }

    const resolvedEmail = email.trim() || `${Date.now()}@prototype.local`;
    onLogin({
      id: `prototype-${Date.now()}`,
      name: buildDisplayName(name, resolvedEmail),
      email: resolvedEmail
    });
  };

  return (
    <main className="auth-screen">
      <section className="auth-shell">
        <div className="auth-copy">
          <div className="screen-eyebrow">TacitSNS Prototype</div>
          <h1>Align your brand goals before you generate images.</h1>
          <p>
            This prototype helps small business owners turn vague brand instincts into
            clearer business goals, post goals, and visual directions.
          </p>

          <div className="auth-copy-card">
            <div className="auth-copy-label">What happens after login</div>
            <ul>
              <li>Define your brand in simple language.</li>
              <li>Choose the business goals the system thinks matter most.</li>
              <li>Create post-goal folders and open each one into the 2x2 studio.</li>
            </ul>
          </div>
        </div>

        <form className="auth-panel" onSubmit={handleSubmit}>
          <div className="screen-eyebrow">Prototype Sign In</div>
          <h2>Enter anything to continue</h2>
          <p>
            Authentication is mocked for now. Any typed input will let you into the system shell.
          </p>

          <label className="auth-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="e.g., Mira Kim"
            />
          </label>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="name@brand.com"
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Any text works for now"
            />
          </label>

          <button type="submit" className="ui-btn ui-btn--primary ui-btn--hero auth-submit" disabled={!canContinue}>
            Continue to brand setup
          </button>
        </form>
      </section>
    </main>
  );
};

export default PrototypeLogin;
