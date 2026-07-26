import sys

with open('src/components/RoomCanvas.tsx', 'r') as f:
    content = f.read()

target = """  return (
    <div className="relative w-full h-full bg-white overflow-hidden text-slate-900 font-sans" style={{ backgroundColor: room.backgroundColor || '#ffffff' }}>
      <BackgroundLayer effect={room.backgroundEffect} color={room.backgroundColor || '#ffffff'} reducedMotion={prefersReduced} />"""

replacement = """  return (
    <div className="relative w-full h-full overflow-hidden text-slate-900 font-sans">
      <BackgroundLayer effect={room.backgroundEffect} color={room.backgroundColor || '#ffffff'} reducedMotion={prefersReduced} />"""

if target in content:
    with open('src/components/RoomCanvas.tsx', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Replaced successfully")
else:
    print("Target not found")
