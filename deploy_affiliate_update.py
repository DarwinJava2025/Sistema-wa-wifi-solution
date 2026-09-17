import paramiko, os, tarfile

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.90.88', port=22, username='alobo', password='6ug-2;q3,1Or')

print('Archiving dashboard/dist...')
with tarfile.open('dash_dist.tar.gz', 'w:gz') as tar:
    tar.add('dashboard/dist', arcname='dist')

sftp = ssh.open_sftp()
sftp.put('dash_dist.tar.gz', '/tmp/dash_dist.tar.gz')
sftp.close()

cmd = 'echo "6ug-2;q3,1Or" | sudo -S rm -rf /var/opt/sistema-wa-wifi-solution/dashboard/dist && echo "6ug-2;q3,1Or" | sudo -S tar -xzf /tmp/dash_dist.tar.gz -C /var/opt/sistema-wa-wifi-solution/dashboard/ && pm2 restart sistema-wa-wifi'
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("STDOUT:", out.encode('ascii', 'ignore').decode('ascii'))
print("STDERR:", err.encode('ascii', 'ignore').decode('ascii'))
ssh.close()
if os.path.exists('dash_dist.tar.gz'):
    os.remove('dash_dist.tar.gz')
print("Deployment completed successfully.")
