$p = 'C:\Users\uriel\Documents\Claude\Projects\אפליקציית חיפוש ורכישת וויסקי'
Set-Location $p
git config user.email 'urielboas@gmail.com'
git config user.name 'Uriel'
git add -A
$status = git status --short 2>&1
$commit = git commit -m 'feat: WBASE-04 Whiskybase attribution' 2>&1
$push = git push origin main 2>&1
"STATUS: $status" | Out-File "$p\push_result.txt" -Encoding utf8
"COMMIT: $commit" | Out-File "$p\push_result.txt" -Append -Encoding utf8
"PUSH: $push" | Out-File "$p\push_result.txt" -Append -Encoding utf8
"DONE" | Out-File "$p\push_result.txt" -Append -Encoding utf8
