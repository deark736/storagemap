
import React from 'react';
import accountIcon from '../assets/images/account.svg';
import organizeIcon from '../assets/images/organize.svg';
import findIcon from '../assets/images/find.svg';

const steps = [
  {
    id: 'account',
    title: 'Create your account',
    description:
      'Sign up for StorageMap to get started with organizing your belongings.',
    icon: accountIcon
  },
  {
    id: 'locations',
    title: 'Add locations and items',
    description:
      'Create storage locations such as rooms, wardrobes, drawers, and boxes. Add your belongings to their corresponding locations to keep everything organized.',
    icon: organizeIcon
  },
  {
    id: 'search',
    title: 'Search and find your items',
    description:
      'Use the search bar to find your belongings by name. Filter items by storage location and select a search result to see exactly where an item is stored.',
    icon: findIcon
  }
];

function HelpView({ isLoggedIn, setCurrentView }) {
  return (
    <div className="help-view">
      <section className="help-intro">
        <span className="home-eyebrow">
          Getting started
        </span>

        <h1>How to use StorageMap</h1>

        <p>
          Organize your belongings and find what you need
          in three simple steps.
        </p>
      </section>

      <section
        className="help-steps"
        aria-label="Getting started steps"
      >
        {steps.map((step, index) => (
          <article
            key={step.id}
            className="help-step"
          >
            <div
              className="help-step-visual"
              aria-hidden="true"
            >
              <img src={step.icon} alt="" />
            </div>

            <div className="help-step-content">
              <span className="help-step-number">
                Step {index + 1}
              </span>

              <h2>{step.title}</h2>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="help-cta">
        <h2>Ready to get organized?</h2>

        <p>
          Give everything a place with StorageMap.
        </p>

        <button
          type="button"
          className="public-button public-button-primary"
          onClick={() =>
            setCurrentView(isLoggedIn ? 'inventory' : 'signup')
          }
        >
          {isLoggedIn ? 'Open inventory' : 'Get started'}
        </button>
      </section>
    </div>
  );
}

export default HelpView;
