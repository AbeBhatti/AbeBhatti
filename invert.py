from PIL import Image

img = Image.open("vercel.png").convert("RGBA")

data = img.getdata()

new_data = []
for r, g, b, a in data:
    # turn everything visible into white, keep transparency
    if a == 0:
        new_data.append((0, 0, 0, 0))
    else:
        new_data.append((255, 255, 255, a))

img.putdata(new_data)
img.save("output.png")