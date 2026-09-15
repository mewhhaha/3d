import importlib.util
from pathlib import Path
import json
import unittest

spec = importlib.util.spec_from_file_location('intake', Path(__file__).resolve().parents[1] / 'scripts/inspect_reference_videos.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
URL = 'https://www.youtube.com/watch?v=H4QyodNR3YU'

class IntakeTests(unittest.TestCase):
    def test_exact_video(self):
        self.assertEqual(m.video_id(URL), 'H4QyodNR3YU')
    def test_rejects_other_hosts_credentials_and_bad_ids(self):
        for url in ['http://www.youtube.com/watch?v=H4QyodNR3YU', 'https://example.com/watch?v=H4QyodNR3YU', 'https://www.youtube.com.evil.test/watch?v=H4QyodNR3YU', 'https://u:p@www.youtube.com/watch?v=H4QyodNR3YU', URL+'&v=Lgg39sZF0kI', 'https://www.youtube.com/watch?v=../bad']:
            with self.subTest(url=url), self.assertRaises(ValueError): m.video_id(url)
    def test_redirect_guard(self):
        with self.assertRaises(ValueError): m.safe_url('https://consent.google.com/')
    def test_balanced_player_json(self):
        data = {'videoDetails': {'videoId': 'H4QyodNR3YU', 'shortDescription': 'test } ; { content'}}
        self.assertEqual(m.player_json('<script>var ytInitialPlayerResponse = '+json.dumps(data)+';</script>'), data)
    def test_caption_timing(self):
        result = m.captions_json(json.dumps({'events': [{'tStartMs': 1234, 'dDurationMs': 800, 'segs': [{'utf8':'hello '},{'utf8':'world'}]}]}))
        self.assertEqual(result, [{'startSeconds':1.234, 'durationSeconds':0.8, 'text':'hello world'}])
    def test_unavailable_is_not_reviewed(self):
        def reader(url): raise TimeoutError()
        result = m.inspect(URL, reader)
        self.assertEqual(result['access'], 'unavailable')
        self.assertFalse(result['visuallyReviewed'])
        self.assertIsNone(result['metadata'])
    def test_login_response_stops_without_captions(self):
        calls=[]
        def reader(url):
            calls.append(url)
            if 'oembed' in url: return json.dumps({'title':'Test tutorial'})
            return 'ytInitialPlayerResponse = '+json.dumps({'playabilityStatus':{'status':'LOGIN_REQUIRED','reason':'Sign in'}})
        result=m.inspect(URL,reader)
        self.assertEqual(len(calls),2)
        self.assertEqual(result['access'],'metadata-only')
        self.assertFalse(result['visuallyReviewed'])
    def test_caption_success_still_not_watched(self):
        def reader(url):
            if 'oembed' in url: return json.dumps({'title':'Test tutorial'})
            if 'timedtext' in url: return json.dumps({'events':[{'tStartMs':0,'segs':[{'utf8':'Synthetic test caption'}]}]})
            return 'ytInitialPlayerResponse = '+json.dumps({'playabilityStatus':{'status':'OK'},'videoDetails':{'videoId':'H4QyodNR3YU'},'captions':{'playerCaptionsTracklistRenderer':{'captionTracks':[{'languageCode':'en','baseUrl':'https://www.youtube.com/api/timedtext?v=H4QyodNR3YU'}]}}})
        result=m.inspect(URL,reader)
        self.assertEqual(result['access'],'captions-readable')
        self.assertFalse(result['visuallyReviewed'])

if __name__ == '__main__': unittest.main()
