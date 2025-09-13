console.log('S-3 worked!');
    const statusEl = document.getElementById('status');

    function showStatus(message, type) {
      statusEl.textContent = message;
      statusEl.className = ''; // Сброс классов
      if (type) {
        statusEl.classList.add(type);
      }
    }

    document.getElementById('getDataBtn').addEventListener('click', () => {
      showStatus('Загрузка данных...', 'loading');

      fetch("https://jsonplaceholder.typicode.com/users")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Ошибка: " + response.status);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Данные: ", data);
          showStatus('Данные успешно получены!', 'success');
          // Здесь можно отобразить данные в DOM, если нужно
        })
        .catch((error) => {
          console.error("Ошибка", error);
          showStatus('Ошибка при получении данных: ' + error.message, 'error');
        });
    });

    document.getElementById('sendDataBtn').addEventListener('click', () => {
      showStatus('Отправка данных...', 'loading');

      fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "new post",
          body: "This post",
          userId: 1,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Ошибка: " + response.status);
          }
          return response.json();
        })
        .then((data) => {
          console.log("YES", data);
          showStatus('Данные успешно отправлены!', 'success');
          // Можно обновить UI, например очистить форму и т.п.
        })
        .catch((error) => {
          console.error("NO", error.message);
          showStatus('Ошибка при отправке данных: ' + error.message, 'error');
        });
    });