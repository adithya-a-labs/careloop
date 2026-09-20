import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemoProfile } from '../../features/demo/DemoContext';
import { PROFILE_LIST } from '../../lib/mock-data';
import { getHomeRoute } from '../../features/demo/role-experience';

export function ProfileSwitcher() {
  const { activeProfile, setActiveProfile } = useDemoProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitch = (profileId: typeof activeProfile.id) => {
    const profile = PROFILE_LIST.find(p => p.id === profileId);
    if (!profile) return;

    setActiveProfile(profileId);

    // Auto-navigate to the correct home page when switching profiles
    const isOnHomePage = location.pathname === '/home' || location.pathname === '/family';
    if (isOnHomePage) {
      navigate(getHomeRoute(profile));
    }
  };

  return (
    <div className="profile-switcher" role="group" aria-label="Switch active profile">
      <span className="profile-switcher-label">View as:</span>
      <div className="profile-pills">
        {PROFILE_LIST.map((profile) => {
          const isActive = activeProfile.id === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              className={`profile-pill ${isActive ? 'active' : ''}`}
              onClick={() => handleSwitch(profile.id)}
              aria-label={`View as ${profile.displayName}`}
              aria-pressed={isActive}
            >
              {isActive && (
                <motion.div
                  layoutId="active-profile-indicator"
                  className="profile-pill-active-indicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="profile-pill-content">
                <span className="profile-pill-emoji" aria-hidden="true">
                  {profile.emoji}
                </span>
                <span className="profile-pill-name">{profile.displayName}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
