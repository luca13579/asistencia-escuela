
// ==========================================
// CONFIGURACIÓN DE LA ESCUELA
// ==========================================

const ESCUELA_LAT = -31.00593;
const ESCUELA_LON = -64.07364;
const RADIO_PERMITIDO = 150;

// Acceso DEMO de preceptoría.
// No usar estas credenciales para datos reales.
const USUARIO_PRECEPTOR = "preceptor";
const CLAVE_PRECEPTOR = "prece412";

// ==========================================
// VARIABLES
// ==========================================

let ubicacionVerificada = false;
let camaraActiva = false;
let flujoCamara = null;
let sesionPreceptor = false;

// ==========================================
// FUNCIONES GENERALES
// ==========================================

function obtenerFechaLocal() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function obtenerHoraLocal() {
    return new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function obtenerFechaBonita() {
    return new Date().toLocaleDateString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function leerAsistencias() {
    try {
        return JSON.parse(localStorage.getItem("asistencias") || "[]");
    } catch (error) {
        console.error("Error leyendo asistencias:", error);
        return [];
    }
}

function guardarAsistencias(asistencias) {
    localStorage.setItem("asistencias", JSON.stringify(asistencias));
}

function leerAlumnos() {
    try {
        return JSON.parse(localStorage.getItem("alumnos") || "[]");
    } catch (error) {
        console.error("Error leyendo alumnos:", error);
        return [];
    }
}

function guardarAlumnos(alumnos) {
    localStorage.setItem("alumnos", JSON.stringify(alumnos));
}

function mostrarResultado(mensaje, tipo) {
    const resultado = document.getElementById("resultadoAlumno");

    resultado.textContent = mensaje;
    resultado.className = "resultado " + tipo;
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => {
        const entidades = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entidades[caracter];
    });
}

// ==========================================
// CAMBIO DE PANTALLAS
// ==========================================

function mostrarPantalla(id) {
    document.querySelectorAll(".pantalla").forEach(pantalla => {
        pantalla.classList.remove("pantalla-activa");
    });

    const destino = document.getElementById(id);

    if (destino) {
        destino.classList.add("pantalla-activa");
    }

    if (id !== "alumno") {
        apagarCamara();
    }

    if (id === "panel" && sesionPreceptor) {
        actualizarTabla();
        actualizarResumen();
    }

    if (id === "alumno") {
        ubicacionVerificada = false;
        actualizarEstadoGPS("Ubicación todavía no verificada.", "pendiente");
        mostrarResultado("", "");
    }
}

// ==========================================
// GPS
// ==========================================

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const radioTierra = 6371000;

    const rad = grados => grados * Math.PI / 180;

    const diferenciaLat = rad(lat2 - lat1);
    const diferenciaLon = rad(lon2 - lon1);

    const a =
        Math.sin(diferenciaLat / 2) ** 2 +
        Math.cos(rad(lat1)) *
        Math.cos(rad(lat2)) *
        Math.sin(diferenciaLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return radioTierra * c;
}

function actualizarEstadoGPS(mensaje, estado) {
    const texto = document.getElementById("estadoUbicacion");
    const insignia = document.getElementById("insigniaGPS");

    texto.textContent = mensaje;
    insignia.className = "insignia " + estado;

    if (estado === "correcto") {
        insignia.textContent = "Verificado";
    } else if (estado === "error") {
        insignia.textContent = "No verificado";
    } else {
        insignia.textContent = "Pendiente";
    }
}

function verificarGPS() {
    const boton = document.getElementById("verificarUbicacion");

    ubicacionVerificada = false;

    if (!navigator.geolocation) {
        actualizarEstadoGPS(
            "Este dispositivo no permite obtener la ubicación.",
            "error"
        );
        return;
    }

    boton.disabled = true;
    boton.textContent = "Verificando ubicación...";

    actualizarEstadoGPS("Obteniendo ubicación del dispositivo...", "pendiente");

    navigator.geolocation.getCurrentPosition(
        posicion => {
            const latitud = posicion.coords.latitude;
            const longitud = posicion.coords.longitude;

            const distancia = calcularDistancia(
                latitud,
                longitud,
                ESCUELA_LAT,
                ESCUELA_LON
            );

            if (distancia <= RADIO_PERMITIDO) {
                ubicacionVerificada = true;

                actualizarEstadoGPS(
                    `Ubicación verificada. Distancia aproximada: ${Math.round(distancia)} metros.`,
                    "correcto"
                );
            } else {
                ubicacionVerificada = false;

                actualizarEstadoGPS(
                    `Estás a aproximadamente ${Math.round(distancia)} metros de la institución. Fuera del radio permitido.`,
                    "error"
                );
            }

            boton.disabled = false;
            boton.textContent = "Verificar ubicación";
        },

        error => {
            ubicacionVerificada = false;

            let mensaje = "No se pudo obtener la ubicación.";

            if (error.code === 1) {
                mensaje = "Permiso de ubicación denegado. Habilitalo en el navegador.";
            } else if (error.code === 2) {
                mensaje = "No se pudo determinar tu ubicación. Intentá nuevamente.";
            } else if (error.code === 3) {
                mensaje = "La ubicación tardó demasiado. Volvé a intentarlo.";
            }

            actualizarEstadoGPS(mensaje, "error");

            boton.disabled = false;
            boton.textContent = "Verificar ubicación";
        },

        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        }
    );
}

// ==========================================
// CÁMARA
// ==========================================

async function activarCamara() {
    const video = document.getElementById("video");
    const placeholder = document.getElementById("cameraPlaceholder");
    const botonActivar = document.getElementById("activarCamara");
    const botonApagar = document.getElementById("apagarCamara");
    const estado = document.getElementById("estadoCamara");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        estado.textContent =
            "Tu navegador no permite usar la cámara. Abrí la página mediante HTTPS.";
        return;
    }

    try {
        flujoCamara = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        video.srcObject = flujoCamara;
        video.style.display = "block";
        placeholder.style.display = "none";

        await video.play();

        camaraActiva = true;

        botonActivar.disabled = true;
        botonApagar.disabled = false;

        estado.textContent = "Cámara activada correctamente.";
    } catch (error) {
        console.error("Error de cámara:", error);

        camaraActiva = false;

        estado.textContent =
            "No se pudo activar la cámara. Revisá los permisos del navegador.";
    }
}

function apagarCamara() {
    const video = document.getElementById("video");
    const placeholder = document.getElementById("cameraPlaceholder");
    const botonActivar = document.getElementById("activarCamara");
    const botonApagar = document.getElementById("apagarCamara");
    const estado = document.getElementById("estadoCamara");

    if (flujoCamara) {
        flujoCamara.getTracks().forEach(track => track.stop());
        flujoCamara = null;
    }

    video.srcObject = null;
    video.style.display = "none";
    placeholder.style.display = "block";

    camaraActiva = false;

    botonActivar.disabled = false;
    botonApagar.disabled = true;

    estado.textContent = "Cámara desactivada.";
}

// ==========================================
// REGISTRO DE ASISTENCIA
// ==========================================

function registrarAsistencia() {
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const curso = document.getElementById("curso").value;
    const division = document.getElementById("division").value;

    if (!nombre || !apellido || !curso || !division) {
        mostrarResultado("Completá todos los datos del formulario.", "error");
        return;
    }

    if (!ubicacionVerificada) {
        mostrarResultado("Primero tenés que verificar la ubicación.", "error");
        return;
    }

    if (!camaraActiva) {
        mostrarResultado("Primero tenés que activar la cámara.", "error");
        return;
    }

    const asistencias = leerAsistencias();
    const fecha = obtenerFechaLocal();

    const yaRegistrado = asistencias.some(asistencia => {
        return (
            asistencia.fecha === fecha &&
            asistencia.nombre.toLowerCase() === nombre.toLowerCase() &&
            asistencia.apellido.toLowerCase() === apellido.toLowerCase() &&
            asistencia.curso === curso &&
            asistencia.division === division
        );
    });

    if (yaRegistrado) {
        mostrarResultado(
            "Este alumno ya tiene una asistencia registrada hoy.",
            "error"
        );
        return;
    }

    const nuevaAsistencia = {
        nombre,
        apellido,
        curso,
        division,
        fecha,
        hora: obtenerHoraLocal()
    };

    asistencias.push(nuevaAsistencia);
    guardarAsistencias(asistencias);

    // Guardar también al alumno en el registro general.
    const alumnos = leerAlumnos();

    const alumnoExiste = alumnos.some(alumno => {
        return (
            alumno.nombre.toLowerCase() === nombre.toLowerCase() &&
            alumno.apellido.toLowerCase() === apellido.toLowerCase() &&
            alumno.curso === curso &&
            alumno.division === division
        );
    });

    if (!alumnoExiste) {
        alumnos.push({
            nombre,
            apellido,
            curso,
            division
        });

        guardarAlumnos(alumnos);
    }

    mostrarResultado(
        `¡Asistencia registrada correctamente! ${nombre} ${apellido}, ${obtenerHoraLocal()}.`,
        "exito"
    );

    document.getElementById("nombre").value = "";
    document.getElementById("apellido").value = "";
    document.getElementById("curso").value = "";
    document.getElementById("division").value = "";

    ubicacionVerificada = false;
    actualizarEstadoGPS("Ubicación todavía no verificada.", "pendiente");

    apagarCamara();
}

// ==========================================
// INICIO DE SESIÓN DEL PRECEPTOR
// ==========================================

document.getElementById("formLogin").addEventListener("submit", function(event) {
    event.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const clave = document.getElementById("clave").value;
    const mensaje = document.getElementById("mensajeLogin");

    if (
        usuario === USUARIO_PRECEPTOR &&
        clave === CLAVE_PRECEPTOR
    ) {
        sesionPreceptor = true;

        mensaje.textContent = "";
        document.getElementById("usuario").value = "";
        document.getElementById("clave").value = "";

        mostrarPantalla("panel");
    } else {
        mensaje.textContent = "Usuario o contraseña incorrectos.";
        mensaje.className = "resultado error";
    }
});

function cerrarSesion() {
    sesionPreceptor = false;
    mostrarPantalla("inicio");
}

// ==========================================
// PANEL: SOLO PRESENTES DE HOY
// ==========================================

function obtenerPresentesDeHoy() {
    const fechaHoy = obtenerFechaLocal();

    return leerAsistencias().filter(asistencia => {
        return asistencia.fecha === fechaHoy;
    });
}

function actualizarTabla() {
    const cuerpo = document.getElementById("cuerpoTabla");
    const buscador = document.getElementById("buscarAlumno");

    if (!cuerpo) return;

    const presentes = obtenerPresentesDeHoy();

    const busqueda = buscador
        ? buscador.value.trim().toLowerCase()
        : "";

    const filtrados = presentes.filter(asistencia => {
        const texto = [
            asistencia.nombre,
            asistencia.apellido,
            asistencia.curso,
            asistencia.division
        ].join(" ").toLowerCase();

        return texto.includes(busqueda);
    });

    if (filtrados.length === 0) {
        cuerpo.innerHTML = `
            <tr>
                <td colspan="5">
                    ${presentes.length === 0
                        ? "Todavía no hay asistencias registradas hoy."
                        : "No se encontraron alumnos con esa búsqueda."}
                </td>
            </tr>
        `;
    } else {
        cuerpo.innerHTML = filtrados.map(asistencia => `
            <tr>
                <td>${escaparHTML(asistencia.apellido)}</td>
                <td>${escaparHTML(asistencia.nombre)}</td>
                <td>${escaparHTML(asistencia.curso)}</td>
                <td>${escaparHTML(asistencia.division)}</td>
                <td>${escaparHTML(asistencia.hora)}</td>
            </tr>
        `).join("");
    }

    document.getElementById("contadorAlumnos").textContent =
        `${filtrados.length} de ${presentes.length} alumnos presentes`;

    document.getElementById("totalAsistencias").textContent =
        presentes.length;

    document.getElementById("fechaListado").textContent =
        "Fecha: " + obtenerFechaBonita();
}

function actualizarResumen() {
    const presentes = obtenerPresentesDeHoy();

    document.getElementById("totalAsistencias").textContent =
        presentes.length;

    document.getElementById("fechaActual").textContent =
        new Date().toLocaleDateString("es-AR");

    document.getElementById("fechaListado").textContent =
        "Fecha: " + obtenerFechaBonita();
}

// ==========================================
// RELOJ DEL PANEL
// ==========================================

function actualizarReloj() {
    const reloj = document.getElementById("relojActual");

    if (reloj) {
        reloj.textContent = new Date().toLocaleTimeString("es-AR");
    }
}

setInterval(actualizarReloj, 1000);
actualizarReloj();

// ==========================================
// IMPRIMIR ASISTENCIA DIARIA
// ==========================================

function imprimirAsistencia() {
    if (!sesionPreceptor) {
        alert("Primero tenés que iniciar sesión.");
        return;
    }

    // Se quita la búsqueda para imprimir a todos los presentes.
    document.getElementById("buscarAlumno").value = "";
    actualizarTabla();

    window.print();
}

// ==========================================
// EXPORTAR ASISTENCIA DIARIA A CSV
// ==========================================

function exportarCSV() {
    if (!sesionPreceptor) {
        alert("Primero tenés que iniciar sesión.");
        return;
    }

    const presentes = obtenerPresentesDeHoy();

    if (presentes.length === 0) {
        alert("No hay asistencias registradas hoy para exportar.");
        return;
    }

    const filas = [
        ["Apellido", "Nombre", "Curso", "Division", "Fecha", "Hora"],
        ...presentes.map(asistencia => [
            asistencia.apellido,
            asistencia.nombre,
            asistencia.curso,
            asistencia.division,
            asistencia.fecha,
            asistencia.hora
        ])
    ];

    const contenido = "\uFEFF" + filas.map(fila => {
        return fila.map(valor => {
            return `"${String(valor ?? "").replace(/"/g, '""')}"`;
        }).join(";");
    }).join("\n");

    const archivo = new Blob(
        [contenido],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = `asistencia-${obtenerFechaLocal()}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    URL.revokeObjectURL(url);
}

// ==========================================
// INICIO
// ==========================================

mostrarPantalla("inicio");
