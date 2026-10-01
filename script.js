// =====================================
// 📍 GPS
// =====================================

const ubicacion = document.getElementById("ubicacion");
const botonGPS = document.getElementById("verificar");

// Coordenadas de la escuela
let ESCUELA_LAT = null;
let ESCUELA_LON = null;

// Radio permitido
const RADIO_PERMITIDO = 200;


// Verificar ubicación
botonGPS.addEventListener("click", function() {

    ubicacion.textContent = "📡 Buscando tu ubicación...";

    navigator.geolocation.getCurrentPosition(

        function(position) {

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            console.log("📍 Tu ubicación:");
            console.log("Latitud:", lat);
            console.log("Longitud:", lon);

            // Si todavía no tenemos ubicación de la escuela,
            // usamos la ubicación actual para la prueba.
            if (ESCUELA_LAT === null) {

                ESCUELA_LAT = lat;
                ESCUELA_LON = lon;

                ubicacion.textContent =
                    "✅ Ubicación de la escuela guardada";

                console.log("🏫 Escuela guardada");
                return;
            }

            const distancia = calcularDistancia(
                lat,
                lon,
                ESCUELA_LAT,
                ESCUELA_LON
            );

            console.log(
                "📏 Distancia:",
                distancia,
                "metros"
            );

            if (distancia <= RADIO_PERMITIDO) {

                ubicacion.textContent =
                    "✅ Estás dentro de la escuela";

            } else {

                ubicacion.textContent =
                    "❌ Estás fuera de la escuela";
            }
        },

        function(error) {

            console.error(error);

            ubicacion.textContent =
                "❌ No se pudo obtener tu ubicación";
        }
    );
});


// Calcular distancia entre dos puntos
function calcularDistancia(lat1, lon1, lat2, lon2) {

    const R = 6371000;

    const rad = Math.PI / 180;

    const dLat =
        (lat2 - lat1) * rad;

    const dLon =
        (lon2 - lon1) * rad;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * rad) *
        Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}
const video = document.getElementById("video");

const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

const botonRegistrar = document.getElementById("registrar");
const botonAsistencia = document.getElementById("asistencia");


// =====================================
// 📷 ENCENDER CÁMARA
// =====================================

navigator.mediaDevices.getUserMedia({ video: true })
    .then(function(stream) {

        video.srcObject = stream;

        estado.textContent = "📷 Cámara encendida";

    })
    .catch(function(error) {

        console.error(error);

        estado.textContent =
            "❌ No se pudo acceder a la cámara";

    });


// =====================================
// 🤖 CARGAR MODELOS
// =====================================

async function cargarModelos() {

    estado.textContent = "🤖 Cargando reconocimiento facial...";

    await faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/"
    );

    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(
        "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/"
    );

    await faceapi.nets.faceRecognitionNet.loadFromUri(
        "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/"
    );

    estado.textContent =
        "✅ Reconocimiento facial listo";

    console.log("Modelos cargados correctamente");

}

cargarModelos();


// =====================================
// 👤 REGISTRAR ALUMNO
// =====================================

botonRegistrar.addEventListener("click", async function() {

    const nombre =
        document.getElementById("nombre").value.trim();

    const apellido =
        document.getElementById("apellido").value.trim();


    if (nombre === "" || apellido === "") {

        alert("⚠️ Escribí tu nombre y apellido");

        return;
    }


    estado.textContent =
        "🔍 Buscando tu cara...";


    const deteccion =
        await faceapi
            .detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks(true)
            .withFaceDescriptor();


    if (!deteccion) {

        estado.textContent =
            "❌ No encontré tu cara. Mirá a la cámara.";

        return;
    }


    // Guardar descriptor + nombre
    const alumno = {

        nombre: nombre,
        apellido: apellido,

        descriptor:
            Array.from(deteccion.descriptor)

    };


    // Obtener alumnos anteriores
    const alumnos =
        JSON.parse(
            localStorage.getItem("alumnos") || "[]"
        );


    alumnos.push(alumno);


    // Guardar
    localStorage.setItem(
        "alumnos",
        JSON.stringify(alumnos)
    );


    estado.textContent =
        "✅ ¡Alumno registrado correctamente!";


    console.log("Alumno guardado:", alumno);

});


// =====================================
// 🧑‍🎓 RECONOCER ALUMNO
// =====================================

botonAsistencia.addEventListener("click", async function() {

    const alumnos =
        JSON.parse(
            localStorage.getItem("alumnos") || "[]"
        );


    if (alumnos.length === 0) {

        resultado.textContent =
            "❌ No hay alumnos registrados.";

        return;
    }


    estado.textContent =
        "🔍 Reconociendo cara...";


    const deteccion =
        await faceapi
            .detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks(true)
            .withFaceDescriptor();


    if (!deteccion) {

        resultado.textContent =
            "❌ No detecté ninguna cara.";

        return;
    }


    const descriptorActual =
        deteccion.descriptor;


    let mejorAlumno = null;

    let menorDistancia = Infinity;


    // Comparar con todos los alumnos
    for (const alumno of alumnos) {

        const descriptorGuardado =
            new Float32Array(alumno.descriptor);


        const distancia =
            faceapi.euclideanDistance(
                descriptorActual,
                descriptorGuardado
            );


        if (distancia < menorDistancia) {

            menorDistancia = distancia;

            mejorAlumno = alumno;

        }

    }


    // Umbral de coincidencia
    if (menorDistancia < 0.6) {

        const ahora = new Date();


        const fecha =
            ahora.toLocaleDateString("es-AR");


        const hora =
            ahora.toLocaleTimeString("es-AR");


        resultado.innerHTML = `
            ✅ <strong>Asistencia registrada</strong><br>
            Alumno: ${mejorAlumno.nombre} ${mejorAlumno.apellido}<br>
            Fecha: ${fecha}<br>
            Hora: ${hora}
        `;


        // Guardar asistencia
        const asistencias =
            JSON.parse(
                localStorage.getItem("asistencias") || "[]"
            );


        asistencias.push({

            nombre: mejorAlumno.nombre,

            apellido: mejorAlumno.apellido,

            fecha: fecha,

            hora: hora

        });


        localStorage.setItem(
            "asistencias",
            JSON.stringify(asistencias)
        );


        estado.textContent =
            "✅ Persona reconocida";

    } else {

        resultado.textContent =
            "❌ No se encontró una coincidencia.";

        estado.textContent =
            "⚠️ Cara no reconocida";

    }

});