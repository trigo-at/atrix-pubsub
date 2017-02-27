" only use js hint
" let b:syntastic_javascript_eslint_exec = './node_modules/.bin/eslint'
" autocmd FileType javascript let b:syntastic_checkers = ['eslint']
let g:ale_linters = {
\   'javascript': ['eslint'],
\}
" let g:ale_sign_column_always = 1
" let g:ale_sign_error = '>>'
" let g:ale_sign_warning =  '--'

" let g:ale_javascript_eslint_executable = './node_modules/.bin/eslint'
