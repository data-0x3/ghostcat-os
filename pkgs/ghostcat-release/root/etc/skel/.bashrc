# GhostCat OS — developed by 0x3
[[ $- != *i* ]] && return
alias ls='ls --color=auto'
alias grep='grep --color=auto'
PS1='\[\e[1;37m\]\u@ghostcat\[\e[0m\] \[\e[90m\]\w\[\e[0m\] \$ '
command -v fastfetch &>/dev/null && fastfetch
