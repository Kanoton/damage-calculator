import importlib.util
from pathlib import Path
import unittest
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('autumn_buildings', ROOT / 'scripts/autumn_building_frames.py')
FRAMES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(FRAMES)

class AutumnBuildingFramesTests(unittest.TestCase):
    def test_approved_sixteen_frames_are_present_in_published_maps(self):
        overlay = FRAMES.building_overlay()
        nodes = ['O31','O32','O33','I04','I05','O25','O04','O24','O05','O23','O06','I11','I12','O17','O16','O15']
        import json
        topology = json.loads((FRAMES.PRODUCTION / 'data/topology.json').read_text())
        for node in topology['nodes']:
            if node['id'] not in nodes:
                continue
            x,y = node['x'],node['y']
            self.assertEqual(sum(pixel[3] > 0 for pixel in overlay.crop((x-46,y-46,x+47,y+47)).getdata()), 2636)
        for path in [FRAMES.MAP] + FRAMES.EVENTS:
            image = Image.open(path).convert('RGBA')
            self.assertEqual(image.size, overlay.size)
            count = sum(alpha > 0 and pixel == FRAMES.BLUE for alpha,pixel in zip(overlay.getchannel('A').getdata(),image.getdata()))
            self.assertEqual(count, FRAMES.EXPECTED_BLUE_PIXELS[path.name], path.name)

    def test_restore_changes_only_the_approved_outline_pixels(self):
        image = Image.open(FRAMES.PRODUCTION / 'Autumn_Map_Base.png').convert('RGBA')
        result = FRAMES.add_building_frames(image)
        expected = Image.open(FRAMES.PRODUCTION / 'Autumn_Map_Buildings.png').convert('RGBA')
        self.assertTrue(all(channel.getbbox() is None for channel in ImageChops.difference(result,expected).split()))
        self.assertTrue(all(channel.getbbox() is None for channel in ImageChops.difference(result,FRAMES.add_building_frames(result)).split()))

    def test_existing_event_annotation_wins_over_blue_outline(self):
        base = Image.open(FRAMES.PRODUCTION / 'Autumn_Map_Base.png').convert('RGBA')
        image = base.copy()
        point = (722,64)
        image.putpixel(point,(0,200,0,255))
        restored = FRAMES.add_building_frames(image,base)
        self.assertEqual(restored.getpixel(point),(0,200,0,255))
        self.assertEqual(restored.getpixel((723,64)),FRAMES.BLUE)
