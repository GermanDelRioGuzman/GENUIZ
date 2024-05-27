document.getElementById('generate').addEventListener('click', function (e) {
  e.preventDefault();  // Prevenir el comportamiento por defecto del botón

  var inputCP = document.getElementById('Np').value; // Obtiene el valor del input
  var dificultad = document.getElementById('Dif').value; // Obtiene el valor del input
  var inputTema = document.getElementById('Tema').value;  // Obtiene el valor del input

  var prompt = `Necesito que desarrolles un examen en formato JSON, el tema del examen será ${inputTema}, la dificultad del examen será ${dificultad} y el número de preguntas será ${inputCP}`;

  fetch('/recibir-datos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'  // Indicamos que enviaremos JSON
    },
    body: JSON.stringify({ miDato: prompt }) // Convertimos el objeto a JSON
  })
  .then(response => response.json())  // Asegúrate de que el servidor responda con JSON
  .then(data => {
    // Mover el procesamiento de datos y la navegación dentro de este bloque
    console.log(data);
    const examenContainer = document.getElementById('examenContainer');
    if (!examenContainer) return;  // Asegurarse de que el elemento existe

    data.preguntas.forEach((pregunta, index) => {  // Asegurarse de que data.preguntas es el formato correcto
      const questionElement = document.createElement('div');
      questionElement.classList.add('question');

      const questionTitle = document.createElement('h3');
      questionTitle.textContent = `${index + 1}. ${pregunta.pregunta}`;
      questionElement.appendChild(questionTitle);

      const answers = pregunta.respuestas;
      Object.keys(answers).forEach(key => {
        const label = document.createElement('label');
        const option = document.createElement('input');
        option.type = 'radio';
        option.name = `pregunta${index}`;
        option.value = key;
        option.classList.add('option');

        label.appendChild(option);
        label.append(` ${key.toUpperCase()}: ${answers[key]}`);
        questionElement.appendChild(label);
        questionElement.appendChild(document.createElement('br'));
      });

      examenContainer.appendChild(questionElement);
    });

    window.location.href = 'vistaEstudiante.html'; // Redirigir solo después de procesar los datos
  })
  .catch(error => console.error('Error:', error)); // Añadir manejo de errores para catch
});
