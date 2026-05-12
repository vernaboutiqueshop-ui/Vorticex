import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("179.43.120.62", port=5414, username="root", password="Sanluis673!pregunta20", timeout=15)

sftp = c.open_sftp()
sftp.put(r"C:\Users\Gonzalo\entrenador-ia\backend\core\nutrition_search.py", "/root/vortice/backend/core/nutrition_search.py")
sftp.close()

_, out, err = c.exec_command("systemctl restart vortice && sleep 2 && systemctl is-active vortice", timeout=12)
print("Service:", out.read().decode().strip())

test = '''
import sys, asyncio
sys.path.insert(0, "/root/vortice/backend")
from dotenv import load_dotenv
load_dotenv("/root/vortice/backend/.env")
from core.nutrition_search import _estimar_con_groq

async def run():
    for q in ["arroz con pollo", "milanesa con pure de papas", "ensalada mixta", "fideos con tuco"]:
        r = await _estimar_con_groq(q)
        if r:
            print(f"{q}: {r['cal_100']} kcal | P:{r['prot_100']} C:{r['carb_100']} G:{r['fat_100']}")

asyncio.run(run())
'''

sftp = c.open_sftp()
with sftp.open('/tmp/test_groq2.py', 'w') as f:
    f.write(test)
sftp.close()

_, out, err = c.exec_command(
    "cd /root/vortice/backend && /root/vortice/backend/venv/bin/python3 /tmp/test_groq2.py 2>&1 | grep -v DATABASE | grep -v VORTICE",
    timeout=25
)
print(out.read().decode("ascii", "ignore"))
c.close()
