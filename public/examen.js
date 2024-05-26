document.addEventListener('DOMContentLoaded', function () {
    const examenData = {
        "Tema": "Matemáticas",
        "Cantidad de preguntas": 2,
        "Nivel de dificultad": "Fácil",
        "examenes": [
            {
                "pregunta": "¿Cuál es el resultado de la siguiente operación: 5 + 3?",
                "respuestas": {
                    "a": 7,
                    "b": 8,
                    "c": 9,
                    "d": 10
                },
                "respuesta_correcta": "b"
            },
            {
                "pregunta": "¿Cuánto es el doble de 6?",
                "respuestas": {
                    "a": 10,
                    "b": 12,
                    "c": 14,
                    "d": 16
                },
                "respuesta_correcta": "b"
            }
        ]
    };

    const examenContainer = document.getElementById('examenContainer');

    examenData.examenes.forEach((examen, index) => {
        const questionElement = document.createElement('div');
        questionElement.classList.add('question');

        const questionTitle = document.createElement('h3');
        questionTitle.textContent = `${index + 1}. ${examen.pregunta}`;
        questionElement.appendChild(questionTitle);

        const answers = examen.respuestas;
        Object.keys(answers).forEach(key => {
            const label = document.createElement('label');
            const option = document.createElement('input');
            option.type = 'radio';
            option.name = `pregunta${index}`;
            option.value = key;
            option.classList.add('option');

            label.appendChild(option);
            label.append(` ${key}: ${answers[key]}`);
            questionElement.appendChild(label);
            questionElement.appendChild(document.createElement('br'));
        });

        examenContainer.appendChild(questionElement);
    });
});
