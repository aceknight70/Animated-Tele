import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """        updateRoom(roomId, { 
          image: imageUrl, 
          image_path: imagePath, 
          image_width: width, 
          image_height: height 
        }, true); """

replacement = """        updateRoom(roomId, { 
          image: imageUrl, 
          image_path: imagePath, 
          image_width: width, 
          image_height: height 
        }); """

if target in content:
    with open('src/App.tsx', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Replaced handleImageUpload successfully")
else:
    print("Target handleImageUpload not found")
