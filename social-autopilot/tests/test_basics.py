"""Run: python -m unittest discover -s tests   (from social-autopilot/)"""
import unittest
from datetime import datetime, timezone

from autopilot.post import PostError, load_queue, parse_post
from autopilot.r2 import sigv4_url
from autopilot.render import _tokens


class SigV4(unittest.TestCase):
    def test_matches_aws_documented_example(self):
        # https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
        url = sigv4_url("GET", "examplebucket.s3.amazonaws.com", "/test.txt", "us-east-1",
                        "AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
                        datetime(2013, 5, 24, tzinfo=timezone.utc), 86400)
        self.assertTrue(url.endswith("X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"), url)


class Queue(unittest.TestCase):
    def test_queue_files_are_valid(self):
        posts, problems = load_queue()
        self.assertEqual(problems, [])
        self.assertGreater(len(posts), 0)

    def test_bad_post_is_rejected(self):
        with self.assertRaises(PostError):
            parse_post({"id": "x", "format": "story"})


class RichText(unittest.TestCase):
    def test_highlight_runs(self):
        self.assertEqual(_tokens('Stop *"My name is..."* now'),
                         [("Stop", False), ('"My', True), ("name", True), ('is..."', True), ("now", False)])
        self.assertEqual(_tokens("*Present:* do"), [("Present:", True), ("do", False)])


if __name__ == "__main__":
    unittest.main()
