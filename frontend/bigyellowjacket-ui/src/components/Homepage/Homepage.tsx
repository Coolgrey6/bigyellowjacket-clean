import React from 'react';
import { Link } from 'react-router-dom';
import { useWebSocketStore } from '../../hooks/useWebSocket';
import { MailingList } from '../MailingList/MailingList';
import './Homepage.css';
import BeeFlock from './BeeFlock';

export const Homepage: React.FC = () => {
  const { isAuthenticated } = useWebSocketStore();
  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero">
        <BeeFlock count={10} />
        <div className="hero-content">
          <div className="bee-mascot" aria-hidden>🐝</div>
          <div className="logo-container">
            <h1 className="company-name">
              <span className="big">BIG</span>
              <span className="yellow-jacket">YELLOW JACKET</span>
              <span className="security">SECURITY</span>
            </h1>
          </div>
          <p className="hero-subtitle">
            Advanced Network Security & Threat Intelligence Platform
          </p>
          <div className="hero-actions">
            <Link to={isAuthenticated ? "/app/monitoring" : "/login"} className="btn btn-primary">
              Launch Dashboard
            </Link>
            <Link to={isAuthenticated ? "/app/monitoring" : "/login"} className="btn btn-secondary">
              View Monitoring
            </Link>
          </div>
        </div>
        <div className="hero-background">
          <div className="wood-texture"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Protect Your Network</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Real-time Monitoring</h3>
              <p>Monitor network traffic, connections, and threats in real-time with our advanced analytics engine.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Threat Intelligence</h3>
              <p>Advanced threat detection and intelligence gathering to keep your network secure from emerging threats.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Alerts</h3>
              <p>Get immediate notifications about suspicious activities and potential security breaches.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics Dashboard</h3>
              <p>Comprehensive reporting and analytics to understand your network's security posture.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Monitoring</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">1000+</div>
              <div className="stat-label">Threats Blocked</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50ms</div>
              <div className="stat-label">Response Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mailing List Section */}
      <section className="mailing-list-section">
        <div className="container">
          <MailingList />
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <h2>Ready to Secure Your Network?</h2>
          <p>Join thousands of organizations trusting Big Yellow Jacket Security for their network protection.</p>
          <div className="cta-actions">
            <Link to={isAuthenticated ? "/app/monitoring" : "/login"} className="btn btn-primary btn-large">
              Launch Dashboard
            </Link>
            <Link to="/app/ports" className="btn btn-outline btn-large">
              Try Port Blocker
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="homepage-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>Big Yellow Jacket Security</h3>
              <p>Advanced Network Security & Threat Intelligence Platform</p>
            </div>
            <div className="footer-links">
              <Link to="/credits" className="footer-link">
                Development Credits
              </Link>
              <Link to={isAuthenticated ? "/app/monitoring" : "/login"} className="footer-link">
                Dashboard
              </Link>
              <Link to="/app/ports" className="footer-link">
                Port Blocker
              </Link>
              <Link to="/app/firewall" className="footer-link">
                Firewall
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Big Yellow Jacket Security. All rights reserved.</p>
            <p>Developed by Donnie Bugden</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
