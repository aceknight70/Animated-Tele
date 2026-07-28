import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """  const updateRoom = async (id: string, updates: Partial<Room>, skipDb: boolean = false) => {
    const roomToUpdate = rooms.find(r => r.id === id);
    if (!roomToUpdate) return;

    const newRooms = rooms.map((r) => (r.id === id ? { ...r, ...updates } : r));
    setRooms(newRooms);

    if (!skipDb) {
      try {
        await updateRoomInDb(newRooms.find(r => r.id === id)!);
      } catch (err: any) {
        setErrorMsg('Failed to update room: ' + err.message);
      }
    }
  };"""

replacement = """  const updateRoom = async (id: string, updates: Partial<Room>, skipDb: boolean = false) => {
    let updatedRoom: Room | undefined;
    setRooms(prevRooms => {
      if (!prevRooms.some(r => r.id === id)) return prevRooms;
      return prevRooms.map((r) => {
        if (r.id === id) {
          updatedRoom = { ...r, ...updates };
          return updatedRoom;
        }
        return r;
      });
    });

    if (!skipDb) {
      try {
        // Find the room from the current state to merge with updates for the DB call.
        // We use the same merge logic to ensure we send the most up-to-date representation we can.
        const currentRoom = rooms.find(r => r.id === id);
        if (currentRoom) {
            await updateRoomInDb({ ...currentRoom, ...updates });
        }
      } catch (err: any) {
        setErrorMsg('Failed to update room: ' + err.message);
      }
    }
  };"""

if target in content:
    with open('src/App.tsx', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Replaced updateRoom successfully")
else:
    print("Target updateRoom not found")
