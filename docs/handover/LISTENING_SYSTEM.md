# Listening system

**Requirement:** the candidate hears a natural dialogue. They must **never** see raw JSON, spec fields (`audio`, `script`, `speaker`, `voices`, `speechRate`, `pauseBetweenTurnsMs`, `maxPlays`, `ttsNotes`, `generationStatus` and others) or internal speaker IDs (`S1`, `S2`).

**Status: RESOLVED and guarded by tests.** The fix commits:
- `c4451a3`: never show raw question data; two-voice audio pipeline;
- `7fa345b`: v2 exam raw-data guard;
- `bf81f76`: S1/S2 labels.

The only remaining gaps are listed at the end.

## 1. How listening questions are stored

`PracticeQuestion.passage` holds one of:
- **Plain text**, for example "S1: Hello... / S2: Hi...". Each line may start with `S1:` or `Speaker 1:`.
- **A JSON production spec** (imported question-bank content):
  ```json
  {"audio":{"script":[{"speaker":"S1","text":"..."},{"speaker":"S2","text":"..."}],
            "voices":{...},"speechRate":0.85,"pauseBetweenTurnsMs":400,"maxPlays":2,
            "ttsNotes":"...","transcriptVisibleToCandidate":false,
            "generationStatus":"generated","audioAssetKey":"question-audio/<uuid>.wav",
            "audioScriptHash":"...","generatedAt":"..."}}
  ```
  An `{"image":{...}}` spec is also possible, for picture tasks.
- For v2 exams: an **ItemGroup** of type audio (an uploaded clip) shared by several questions.

Admin screens read and write the raw value unchanged. Only the candidate side converts it.

## 2. The one conversion point: `src/lib/question-stimulus.ts`

- `parseStimulus(passage, question)` and `candidateStimulus(...)` turn `passage` into a safe `Stimulus`:
  - `none`;
  - `text`;
  - `audio`: `turns[]`, `rate`, `pauseMs`, `playLimit`, `audioUrl` and an optional `transcript`;
  - `image`: a description and features. The illustrator brief is never sent.
- **Every internal field is dropped here.** JSON that isn't a recognised spec, including malformed JSON, becomes `none`, **never raw text**.
- A plain-text dialogue on a listening question is **heard, not shown**. It's split into turns so each speaker gets a different voice, and the `S1:` labels are never spoken.
- A dialogue on a *non*-listening question is shown with neutral labels ("Speaker 1: ...").
- A visible transcript only appears when the spec says `transcriptVisibleToCandidate: true`, and then it uses "Speaker 1/2", never S1/S2.
- `validateSpeakerReferences()` stops new or edited listening questions from mentioning S1/S2 in the prompt, options, answer or explanation. It's used in `src/lib/question-import.ts` and `src/app/api/admin/questions/[id]/route.ts`.
- `prisma/question-audio/speaker-labels.mjs` must stay in step with `parseDialogueText` (both are tested in `tests/unit/speaker-labels.test.ts`).

**Candidate routes that use it:**
- `api/practice/questions` (practice and v1 mock sections);
- `api/practice/questions/generate`;
- `src/lib/exam-runner.ts` (v2 exams);
- `src/lib/skills/drills.ts` (drills and diagnostics);
- `api/conversations` (via `stimulusText`).

## 3. How audio is produced

1. **Pre-generated file (preferred):**
   - `npm run generate:question-audio` (`prisma/generate-question-audio.mjs`) speaks each spec's script with **Windows built-in voices**, one per speaker, at the spec's rate and pauses.
   - It uploads the WAV to R2 under `question-audio/`, then writes `generationStatus`, `audioAssetKey` and `audioScriptHash` back into the spec.
   - Needs a Windows PC. Use `--production` for the live database, `--dry-run` to preview.
   - `npm run generate:listening-voices` does the same with **ElevenLabs** voices. It's paid and needs `ELEVENLABS_API_KEY`, so it's **not used now**.
2. **Serving:**
   - `GET /api/questions/[id]/audio` streams the file only when the stored key matches the expected pattern and the script hash still matches.
   - If an admin edits the script, the old audio is ignored automatically.
3. **Fallback:**
   - With no fresh file, the browser speaks the turns itself (Web Speech API), a different voice and pitch per speaker.
   - Component: `ListeningPlayer` in `src/components/questions/StimulusView.tsx`.
4. **Play limits:**
   - `maxPlays` is enforced in the player.
   - For v2 exams the server also enforces it (`api/exam-sessions/[id]/audio-play`, 403 after the limit).
5. **Separate "Listen" buttons** (Phase 3): results page, voice practice and conversation.
   - These use `/api/tts`: ElevenLabs when a key exists, otherwise the best device voice (`pickDeviceVoice` in `src/components/speech/speech.ts`).
   - They are not listening *questions*.

## 4. What the candidate sees

A player ("Listening recording") with play/replay and a remaining-plays count, then the question. There is no script, no speaker IDs and no spec data. A friendly message appears if audio can't play.

## 5. Tests that prove it (keep them passing)

- `tests/unit/question-stimulus.test.ts`: every spec shape; malformed or unknown JSON gives `none`; internal fields are dropped.
- `tests/unit/speaker-labels.test.ts` and `tests/unit/question-audio.test.ts`: dialogue parsing, script hash, generator behaviour.
- `tests/e2e/raw-data-guard.spec.ts`: raw data never reaches the wire or the screen. It covers practice, a refresh mid mock-test, and resuming a v2 exam.
- `tests/e2e/mock-test-rendering.spec.ts`: listening renders as a player.

## 6. Remaining gaps

| Gap | Effect | Suggested fix |
|---|---|---|
| Import/edit doesn't check that a **listening** question has a *playable* stimulus. An unrecognised or malformed JSON `passage` is accepted. | That question shows **no audio at all**. It's safe (no raw JSON), but unanswerable. | In `src/lib/question-validation.ts`: for LISTENING / LISTENING_COMPREHENSION, reject a JSON passage when `parseStimulusSpec()` returns null or has no turns. Add a unit test. |
| Browser-voice quality depends on the device (free mode). | Some phones have one robotic voice; both speakers may sound alike (pitch still differs). | Run `generate:question-audio` on a Windows PC for all listening questions (free), or enable ElevenLabs later (paid). |
| Small listening pool in some levels (see QUESTION_BANK.md). | Repeats sooner. | Add listening content. |
