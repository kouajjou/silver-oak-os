module.exports = {
  apps: [
    {
      name: 'silver-oak-os-backend',
      script: 'dist/index.js',
      cwd: '/app/silver-oak-os',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_file: '/app/silver-oak-os/logs/backend.log',
      out_file: '/app/silver-oak-os/logs/backend-out.log',
      error_file: '/app/silver-oak-os/logs/backend-err.log',
      time: true,
      restart_delay: 5000,
      max_restarts: 5,
      env_file: '/app/silver-oak-os/.env.main',
      env: {
        NODE_ENV: 'production',
        HOME: '/home/claudeclaw',
        DASHBOARD_PORT: '3141',
        DASHBOARD_TOKEN: 'e8e6c27f94d32b60875c58715331bb93fa173d88af7d9bd2'
      }
    }
  ]
};
