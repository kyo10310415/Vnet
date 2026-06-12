module.exports = {
  apps: [
    {
      name: 'vtuber-ops',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/home/user/vtuber-ops',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://vtuber_user:vtuber_pass@localhost:5432/vtuber_ops',
        NEXTAUTH_SECRET: 'dev-secret-change-in-production',
        NEXTAUTH_URL: 'http://localhost:3001',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
