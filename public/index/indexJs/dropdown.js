function inicializarDropdowns() {
    const menusDropdown = document.querySelectorAll('.dropdown');

    menusDropdown.forEach(menu => {
        const botaoDropdown = menu.querySelector('.dropbtn');
    
        botaoDropdown.addEventListener('click', function(evento) {
            evento.stopPropagation();
            alternarMenu(menu);
        });
    });

    document.addEventListener('click', function() {
        fecharTodosDropdowns();
    });
}

function alternarMenu(menu) {
    menu.classList.toggle('active');
}

function fecharTodosDropdowns() {
    const menusAbertos = document.querySelectorAll('.dropdown.active');
    menusAbertos.forEach(menu => {
        menu.classList.remove('active');
    });
}

// Verifica se o DOM já está carregado para inicializar
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    inicializarDropdowns();
} else {
    document.addEventListener('DOMContentLoaded', inicializarDropdowns);
}
