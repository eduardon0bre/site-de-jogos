function inicializarDropdowns() {
    const menusDropdown = document.querySelectorAll('.dropdown');

    menusDropdown.forEach(menu => {
        const botaoDropdown = menu.querySelector('.dropbtn');

        botaoDropdown.addEventListener('click', function (evento) {
            evento.stopPropagation();
            alternarMenu(menu);
        });
    });

    document.addEventListener('click', function () {
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

let categoriaAtiva = null;

function inicializarBusca() {
    const campoBusca = document.querySelector('.search-input');
    const botaoBusca = document.querySelector('.search-btn');
    const cards = document.querySelectorAll('.game-card');

    function filtrarJogos() {
        const termo = campoBusca.value.toLowerCase().trim();

        cards.forEach(card => {
            const titulo = card.querySelector('.game-title').textContent.toLowerCase();
            const categorias = (card.dataset.category || '').toLowerCase();

            const passaBusca = termo === '' || titulo.includes(termo);
            const passaCategoria = !categoriaAtiva || categorias.includes(categoriaAtiva);

            card.style.display = (passaBusca && passaCategoria) ? '' : 'none';
        });
    }

    campoBusca.addEventListener('input', filtrarJogos);

    botaoBusca.addEventListener('click', function (e) {
        e.preventDefault();
        filtrarJogos();
    });

    campoBusca.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            filtrarJogos();
        }
    });

    window.aplicarFiltros = filtrarJogos;
}

function inicializarCategorias() {
    const linksCategoria = document.querySelectorAll('.dropdown-content a');

    linksCategoria.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const textoCompleto = this.textContent.trim();
            // Remove emoji do início e pega só o nome da categoria
            const nomeCategoria = textoCompleto.replace(/^[\p{Emoji}\s]+/u, '').toLowerCase().trim();

            // Se clicar na mesma categoria, desativa o filtro
            if (categoriaAtiva === nomeCategoria) {
                categoriaAtiva = null;
                linksCategoria.forEach(l => l.classList.remove('active-category'));
            } else {
                categoriaAtiva = nomeCategoria;
                linksCategoria.forEach(l => l.classList.remove('active-category'));
                this.classList.add('active-category');
            }

            fecharTodosDropdowns();

            if (window.aplicarFiltros) {
                window.aplicarFiltros();
            }
        });
    });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    inicializarDropdowns();
    inicializarBusca();
    inicializarCategorias();
} else {
    document.addEventListener('DOMContentLoaded', function () {
        inicializarDropdowns();
        inicializarBusca();
        inicializarCategorias();
    });
}
