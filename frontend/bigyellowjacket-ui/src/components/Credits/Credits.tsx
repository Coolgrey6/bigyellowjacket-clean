import React from 'react';
import { Link } from 'react-router-dom';
import './Credits.css';

export const Credits: React.FC = () => {
  return (
    <div className="credits-page">
      <div className="credits-container">
        <div className="credits-header">
          <h1>Big Yellow Jacket Security</h1>
          <h2>Development Credits & Acknowledgments</h2>
          <p className="credits-subtitle">
            This project represents the collaborative effort of talented developers and contributors
            who brought the Big Yellow Jacket Security platform to life.
          </p>
        </div>

        <div className="credits-sections">
          {/* Core Development Team */}
          <section className="credits-section">
            <h3>🏗️ Core Development Team</h3>
            <div className="credits-grid">
              <div className="credit-card">
                <h4>Backend Architecture</h4>
                <p>Python WebSocket server, network monitoring, threat intelligence integration</p>
                <ul>
                  <li>Real-time data processing</li>
                  <li>WebSocket communication</li>
                  <li>System metrics collection</li>
                  <li>Threat detection algorithms</li>
                </ul>
              </div>
              <div className="credit-card">
                <h4>Frontend Development</h4>
                <p>React TypeScript application with modern UI/UX design</p>
                <ul>
                  <li>Component architecture</li>
                  <li>State management with Zustand</li>
                  <li>Real-time data visualization</li>
                  <li>Responsive design implementation</li>
                </ul>
              </div>
              <div className="credit-card">
                <h4>UI/UX Design</h4>
                <p>Professional homepage and dashboard design inspired by Big Yellow Jacket branding</p>
                <ul>
                  <li>3D logo design and animation</li>
                  <li>Color scheme and typography</li>
                  <li>User experience optimization</li>
                  <li>Accessibility implementation</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Technology Stack */}
          <section className="credits-section">
            <h3>🛠️ Technology Stack</h3>
            <div className="tech-stack">
              <div className="tech-category">
                <h4>Frontend Technologies</h4>
                <div className="tech-tags">
                  <span className="tech-tag">React 18.3.1</span>
                  <span className="tech-tag">TypeScript 5.6.2</span>
                  <span className="tech-tag">Vite 5.4.10</span>
                  <span className="tech-tag">Tailwind CSS 3.4.15</span>
                  <span className="tech-tag">React Router DOM 7.1.0</span>
                  <span className="tech-tag">Zustand 5.0.1</span>
                  <span className="tech-tag">Recharts 2.13.3</span>
                  <span className="tech-tag">Lucide React 0.461.0</span>
                </div>
              </div>
              <div className="tech-category">
                <h4>Backend Technologies</h4>
                <div className="tech-tags">
                  <span className="tech-tag">Python 3.9</span>
                  <span className="tech-tag">WebSockets</span>
                  <span className="tech-tag">asyncio</span>
                  <span className="tech-tag">psutil</span>
                  <span className="tech-tag">JSON API</span>
                </div>
              </div>
              <div className="tech-category">
                <h4>Development Tools</h4>
                <div className="tech-tags">
                  <span className="tech-tag">ESLint 9.13.0</span>
                  <span className="tech-tag">PostCSS 8.4.49</span>
                  <span className="tech-tag">Autoprefixer 10.4.20</span>
                  <span className="tech-tag">Hot Module Replacement</span>
                </div>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section className="credits-section">
            <h3>✨ Key Features Implemented</h3>
            <div className="features-list">
              <div className="feature-group">
                <h4>Real-time Monitoring</h4>
                <ul>
                  <li>Live network traffic analysis</li>
                  <li>Connection status tracking</li>
                  <li>System performance metrics</li>
                  <li>WebSocket-based data streaming</li>
                </ul>
              </div>
              <div className="feature-group">
                <h4>Security Features</h4>
                <ul>
                  <li>Threat intelligence integration</li>
                  <li>Automated threat detection</li>
                  <li>IP blocking and filtering</li>
                  <li>Security alert system</li>
                </ul>
              </div>
              <div className="feature-group">
                <h4>User Interface</h4>
                <ul>
                  <li>Professional homepage design</li>
                  <li>Interactive dashboard</li>
                  <li>Data visualization charts</li>
                  <li>Responsive mobile design</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Special Acknowledgments */}
          <section className="credits-section">
            <h3>🙏 Special Acknowledgments</h3>
            <div className="acknowledgments">
              <div className="acknowledgment-item">
                <h4>Design Inspiration</h4>
                <p>Homepage design inspired by the original Big Yellow Jacket Security 3D sign, featuring the iconic yellow hooded jacket logo and professional branding elements.</p>
              </div>
              <div className="acknowledgment-item">
                <h4>AI Development Support</h4>
                <p>Special thanks to Grok and Elon Musk for their contributions to AI development and the tools that made this project possible. Your vision for AI-assisted development has been instrumental in bringing Big Yellow Jacket Security to life.</p>
              </div>
              <div className="acknowledgment-item">
                <h4>Open Source Community</h4>
                <p>Built with the support of the open source community and modern web development tools that make rapid development possible.</p>
              </div>
              <div className="acknowledgment-item">
                <h4>Security Industry Standards</h4>
                <p>Implementation follows industry best practices for network security monitoring and threat intelligence platforms.</p>
              </div>
            </div>
          </section>

          {/* Project Timeline */}
          <section className="credits-section">
            <h3>📅 Development Timeline</h3>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-date">Phase 1</div>
                <div className="timeline-content">
                  <h4>Backend Foundation</h4>
                  <p>Python WebSocket server, data processing, and API development</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">Phase 2</div>
                <div className="timeline-content">
                  <h4>Frontend Development</h4>
                  <p>React application, component architecture, and state management</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">Phase 3</div>
                <div className="timeline-content">
                  <h4>UI/UX Design</h4>
                  <p>Professional homepage, branding, and user experience optimization</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-date">Phase 4</div>
                <div className="timeline-content">
                  <h4>Integration & Polish</h4>
                  <p>Feature integration, testing, and final refinements</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="credits-footer">
          <p className="footer-text">
            Big Yellow Jacket Security - Advanced Network Security & Threat Intelligence Platform
          </p>
          <p className="developer-credit">
            &copy; 2024 Donnie Bugden. All rights reserved.
          </p>
          <div className="footer-actions">
            <Link to="/" className="btn btn-primary">
              Back to Homepage
            </Link>
            <Link to="/app" className="btn btn-secondary">
              Launch Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
