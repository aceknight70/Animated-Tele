import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target1 = '<div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">'
replacement1 = '<div className="h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">'

target2 = '<div className="flex-1 overflow-y-auto p-5 space-y-6">'
replacement2 = '<div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32">'

target3 = '<div className="flex-1 overflow-y-auto p-3 space-y-2">'
replacement3 = '<div className="flex-1 overflow-y-auto p-3 space-y-2 pb-32">'

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Replaced target1")
else:
    print("Target1 not found")
    
if target2 in content:
    content = content.replace(target2, replacement2)
    print("Replaced target2")
else:
    print("Target2 not found")
    
if target3 in content:
    content = content.replace(target3, replacement3)
    print("Replaced target3")
else:
    print("Target3 not found")

with open('src/App.tsx', 'w') as f:
    f.write(content)
