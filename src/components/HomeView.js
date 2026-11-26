
import React from 'react';
import storageHero from '../assets/images/storage-hero.svg';
import recordIcon from '../assets/images/record.svg';
import findIcon from '../assets/images/find.svg';
import organizeIcon from '../assets/images/organize.svg';

const features = [
  {
    id: 'record',
    title: 'Record',
    description: 'Keep track of where your belongings are stored.',
    icon: recordIcon
  },
  {
    id: 'find',
    title: 'Find',
    description: 'Find the items you need in seconds.',
    icon: findIcon
  },
  {
    id: 'organize',
    title: 'Organize',
    description: 'Create an organized home, one location at a time.',
    icon: organizeIcon
  }
];

function HomeView({ isLoggedIn, setCurrentView }) {
  return (
    <div className="home-view">
      <section className="home-hero">
        <div className="home-hero-visual">
          <img
            src={storageHero}
            alt="Organized storage shelves with labeled boxes and a search symbol"
            className="home-hero-image"
          />
        </div>

        <div className="home-hero-content">
          <span className="home-eyebrow">
            A place for everything
          </span>

          <h1>Know where everything belongs.</h1>

          <p>
            Organize your belongings, keep track of storage
            locations, and find what you need without the
            frustration of searching everywhere.
          </p>

          <div className="home-hero-actions">
            <button
              type="button"
              className="public-button public-button-primary"
              onClick={() =>
                setCurrentView(isLoggedIn ? 'inventory' : 'signup')
              }
            >
              {isLoggedIn ? 'Open inventory' : 'Get started'}
            </button>

            <button
              type="button"
              className="public-button public-button-secondary"
              onClick={() => setCurrentView('help')}
            >
              How it works
            </button>
          </div>
        </div>
      </section>

      <section
        className="home-features"
        aria-labelledby="home-features-heading"
      >
        <h2 id="home-features-heading">
          Simplify your everyday life
        </h2>

        <p className="home-section-description">
          Everything you need to keep your belongings organized.
        </p>

        <div className="home-feature-grid">
          {features.map(feature => (
            <article
              key={feature.id}
              className="home-feature-card"
            >
              <div
                className="home-feature-icon"
                aria-hidden="true"
              >
                <img src={feature.icon} alt="" />
              </div>

              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomeView;
