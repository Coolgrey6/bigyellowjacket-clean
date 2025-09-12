import React, { useState } from 'react';
import './MailingList.css';

export const MailingList: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call - replace with actual mailing list service
    setTimeout(() => {
      setIsSubscribed(true);
      setIsLoading(false);
      setEmail('');
    }, 1000);
  };

  if (isSubscribed) {
    return (
      <div className="mailing-list-success">
        <div className="success-icon">✓</div>
        <h3>Thank You for Subscribing!</h3>
        <p>You'll receive the latest Big Yellow Jacket Security updates and threat intelligence reports.</p>
        <button 
          onClick={() => setIsSubscribed(false)}
          className="btn btn-outline"
        >
          Subscribe Another Email
        </button>
      </div>
    );
  }

  return (
    <div className="mailing-list">
      <div className="mailing-list-content">
        <h3>Stay Updated with Big Yellow Jacket Security</h3>
        <p>Get the latest threat intelligence, security updates, and platform news delivered to your inbox.</p>
        
        <form onSubmit={handleSubmit} className="mailing-list-form">
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="email-input"
            />
            <button 
              type="submit" 
              disabled={isLoading || !email}
              className="btn btn-primary subscribe-btn"
            >
              {isLoading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>
        </form>
        
        <div className="mailing-list-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">🛡️</span>
            <span>Weekly threat intelligence reports</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">📊</span>
            <span>Security trend analysis</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🚨</span>
            <span>Critical security alerts</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🔧</span>
            <span>Platform updates and features</span>
          </div>
        </div>
        
        <p className="privacy-note">
          We respect your privacy. Unsubscribe at any time. No spam, ever.
        </p>
      </div>
    </div>
  );
};
