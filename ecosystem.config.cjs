module.exports = {
  apps: [{
    name: 'silver-oak-os-frontend',
    script: 'npm',
    args: 'start -- -p 3010 -H 0.0.0.0',
    cwd: '/app/silver-oak-os/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: '3010'
    },
    max_memory_restart: '512M',
    watch: false,
    autorestart: true
  }]
};
