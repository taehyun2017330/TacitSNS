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
      <section className="auth-shell auth-shell--centered">
        <form className="auth-panel" onSubmit={handleSubmit}>
          <h2>Get started</h2>
          <p>
            Use the research account to continue.
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
              placeholder="Enter your password"
            />
          </label>

          <button type="submit" className="ui-btn ui-btn--primary ui-btn--hero auth-submit" disabled={!canContinue}>
            Continue
          </button>
        </form>
      </section>
    </main>
  );
};

export default PrototypeLogin;
