module.exports = {
  apps: [
    {
      name: 'silver-oak-os-frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3010',
      cwd: '/app/silver-oak-os/frontend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      kill_timeout: 8000,
      watch: false,
      max_memory_restart: '512M',
      log_file: '/home/claudeclaw/.pm2/logs/silver-oak-os-frontend.log',
      out_file: '/home/claudeclaw/.pm2/logs/silver-oak-os-frontend-out.log',
      error_file: '/home/claudeclaw/.pm2/logs/silver-oak-os-frontend-err.log',
      time: true,
      restart_delay: 10000,
      max_restarts: 50,
      env: {
        NODE_ENV: 'production',
        PORT: '3010'
      }
    }
  ]
};
