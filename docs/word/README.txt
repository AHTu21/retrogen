Word-версии документов из docs/*.md
=====================================

Сгенерировано pandoc из Markdown. Исходники править в .md; после правок пересобрать:

  pandoc docs\ИМЯ.md -o docs\word\ИМЯ.docx --from markdown --to docx

Или из корня репозитория (все файлы):

  Get-ChildItem docs\*.md | ForEach-Object {
    pandoc $_.FullName -o ("docs\word\" + $_.BaseName + ".docx") --from markdown --to docx
  }
