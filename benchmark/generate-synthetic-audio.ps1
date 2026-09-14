# Generates a DISCLOSED SYNTHETIC test recording using the Windows built-in
# speech synthesizer (System.Speech). This is NOT a real candidate voice and
# must never be treated as evidence of real-world pronunciation accuracy.
# It exists only to produce a real audio file so we can prove the
# audio -> transcription -> analysis pipeline against the real cloud APIs.

Add-Type -AssemblyName System.Speech

$outDir = Join-Path $PSScriptRoot "audio"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$script = "Um, thank you for calling. I understand, you know, that you are upset about the delayed delivery, and I want to, uh, help you resolve this as quickly as possible today. Let me check the status of your order right now."

$outPath = Join-Path $outDir "synthetic_customer_service_01.wav"

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = -1
$synth.SetOutputToWaveFile($outPath)
$synth.Speak($script)
$synth.SetOutputToNull()
$synth.Dispose()

# Save the known ground-truth script text alongside the audio for comparison.
$script | Out-File -FilePath (Join-Path $outDir "synthetic_customer_service_01.txt") -Encoding utf8 -NoNewline

Write-Output "Generated: $outPath"
