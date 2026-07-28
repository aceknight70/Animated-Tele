import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """    // Optimistic update
    const newRooms = [...rooms, newRoom];
    setRooms(newRooms);
    setSelectedRoomId(newRoom.id);

    try {
      await createRoomInDb(newRoom);
    } catch (err: any) {
      setErrorMsg('Failed to create room: ' + err.message);
      // rollback
      setRooms(rooms);
    }"""

replacement = """    // Optimistic update
    setRooms(prev => [...prev, newRoom]);
    setSelectedRoomId(newRoom.id);

    try {
      await createRoomInDb(newRoom);
    } catch (err: any) {
      setErrorMsg('Failed to create room: ' + err.message);
      // rollback
      setRooms(prev => prev.filter(r => r.id !== newRoom.id));
    }"""

if target in content:
    with open('src/App.tsx', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Replaced addRoom successfully")
else:
    print("Target addRoom not found")
