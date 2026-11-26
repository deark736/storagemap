
import React from 'react';

function Footer() {
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div className="public-footer-top">
          <span className="public-footer-brand">
            StorageMap
          </span>

          <p className="public-footer-tagline">
            A place for everything.
          </p>
        </div>

        <div className="public-footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} StorageMap Team.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
