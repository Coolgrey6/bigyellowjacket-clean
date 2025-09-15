import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

interface LoginFormProps {
  onLogin: (user: { username: string; role: string; password: string }) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Demo credentials with random usernames and unique strong passwords
    const validCredentials = {
      'phoenix_7x': 'SecureNet@2024#Phoenix!',
      'storm_delta': 'CyberGuard$2024*Storm&',
      'cyber_wolf': 'FireWall!2024@Wolf#Secure',
      'shadow_ops': 'NetShield%2024^Shadow*Ops'
    };

    if (validCredentials[formData.username as keyof typeof validCredentials] === formData.password) {
      const role = formData.username === 'phoenix_7x' ? 'admin' : 'user';
      await onLogin({ username: formData.username, role, password: formData.password });
      navigate('/app');
    } else {
      setError('Invalid username or password');
    }
    
    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="jacket-icon-small">🛡️</div>
            <h1>Big Yellow Jacket Security</h1>
          </div>
          <p>Sign in to access the security dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-demo">
          <h4>Demo Access Available</h4>
          <div className="demo-credentials">
            <div className="demo-account">
              <strong>Contact your system administrator for demo credentials</strong>
            </div>
            <div className="demo-account">
              <em>Multiple account types available: Admin, Security, Firewall, Operations</em>
            </div>
          </div>
        </div>

        <div className="auth-footer">
          <p>&copy; 2024 Big Yellow Jacket Security. All rights reserved.</p>
          <p>Developed by Donnie Bugden</p>
        </div>
      </div>
    </div>
  );
};
