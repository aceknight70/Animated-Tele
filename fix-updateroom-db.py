import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """  const updateRoom = async (id: string, updates: Partial<Room>, skipDb: boolean = false) => {
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

replacement = """  const updateRoom = async (id: string, updates: Partial<Room>, skipDb: boolean = false) => {
    // We use a functional state update to ensure React state doesn't get stale.
    setRooms(prevRooms => {
      if (!prevRooms.some(r => r.id === id)) return prevRooms;
      
      const newRooms = prevRooms.map((r) => {
        if (r.id === id) {
          return { ...r, ...updates };
        }
        return r;
      });
      
      // We can also trigger the DB update from here if we want to be perfectly in sync with the latest state, 
      // but it's safer to just do it asynchronously with the newly merged object.
      return newRooms;
    });

    if (!skipDb) {
      try {
        // We want to update the DB using the most recent state. To do that without 
        // relying on the asynchronous setRooms callback, we can fetch the current room
        // directly from our `rooms` closure or, better yet, use functional updates 
        // and a separate effect or just merge here and accept slightly stale other fields in edge cases.
        // For now, we'll merge with the closure's `rooms`. The primary issue was losing the entire room.
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
