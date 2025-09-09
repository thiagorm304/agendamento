// *** IMPORTANTE: COLOQUE AQUI O URL DA SUA API DO GOOGLE APPS SCRIPT ***
const APPS_SCRIPT_API_URL = 'COLE_AQUI_O_URL_DO_SEU_WEB_APP_IMPLANTADO_NO_APPS_SCRIPT'; // Ex: https://script.google.com/macros/s/AKfycbzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/exec

// *** Importante: Defina o fuso horário do salão aqui.
// Ele deve ser o MESMO fuso horário configurado nas propriedades do projeto Apps Script (.gs)
const SALON_TIMEZONE = 'America/Sao_Paulo'; // Exemplo: ajuste para o fuso horário real do seu salão

// Funções auxiliares para feedback visual
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('errorMsg').style.display = 'none';
    document.getElementById('responseMessage').innerText = '';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    document.getElementById('errorMsg').innerText = message;
    document.getElementById('errorMsg').style.display = 'block';
    hideLoading();
}

function hideError() {
    document.getElementById('errorMsg').style.display = 'none';
}

function setResponseMessage(message, isSuccess) {
    const responseMessageDiv = document.getElementById('responseMessage');
    responseMessageDiv.innerText = message;
    responseMessageDiv.style.display = 'block';
    responseMessageDiv.style.backgroundColor = isSuccess ? '#e8f5e9' : '#ffebee';
    responseMessageDiv.style.color = isSuccess ? '#2e7d32' : '#d32f2f';
}

function validateForm() {
    const serviceValue = document.getElementById('service').value;
    const selectedDate = document.getElementById('datePicker').value;
    const selectedTimeSlot = document.getElementById('timeSlot').value;
    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const bookButton = document.getElementById('bookButton');

    if (serviceValue && selectedDate && selectedTimeSlot && customerName && customerEmail) {
        bookButton.disabled = false;
    } else {
        bookButton.disabled = true;
    }
}

// Função para buscar horários disponíveis
async function getAvailableTimes() {
    hideError();
    setResponseMessage('', false); // Limpa mensagens de sucesso/erro anteriores

    const serviceSelect = document.getElementById('service');
    const datePicker = document.getElementById('datePicker');
    const timeSlotSelect = document.getElementById('timeSlot');
    const bookButton = document.getElementById('bookButton');

    timeSlotSelect.innerHTML = '<option value="">Buscando...</option>';
    timeSlotSelect.disabled = true;
    timeSlotSelect.classList.add('disabled-look'); // Adiciona estilo de desabilitado
    bookButton.disabled = true; // Desabilita o botão de agendar

    const serviceValue = serviceSelect.value;
    const selectedDate = datePicker.value;

    if (!serviceValue || !selectedDate) {
        timeSlotSelect.innerHTML = '<option value="">Selecione serviço e data</option>';
        hideLoading();
        validateForm(); // Revalida o formulário
        return;
    }

    showLoading();

    const [serviceName, duration] = serviceValue.split('_');

    try {
        const response = await fetch(APPS_SCRIPT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getAvailableTimes',
                data: {
                    dateStr: selectedDate,
                    serviceDurationMin: parseInt(duration)
                }
            })
        });

        const result = await response.json();

        hideLoading();
        if (result.success) {
            if (result.data.length === 0) {
                timeSlotSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
                timeSlotSelect.disabled = true;
                showError("Nenhum horário disponível para a data e serviço selecionados.");
            } else {
                timeSlotSelect.innerHTML = '<option value="">Selecione um horário</option>';
                result.data.forEach(time => {
                    const option = document.createElement('option');
                    option.value = time.start; // A string ISO UTC original
                    option.innerText = new Date(time.start).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: SALON_TIMEZONE
                    });
                    timeSlotSelect.appendChild(option);
                });
                timeSlotSelect.disabled = false;
                timeSlotSelect.classList.remove('disabled-look'); // Remove estilo de desabilitado
            }
        } else {
            showError('Erro ao buscar horários: ' + result.error);
            timeSlotSelect.innerHTML = '<option value="">Erro</option>';
            timeSlotSelect.disabled = true;
            timeSlotSelect.classList.add('disabled-look');
        }
    } catch (error) {
        hideLoading();
        showError('Erro de rede ou comunicação: ' + error.message);
        timeSlotSelect.innerHTML = '<option value="">Erro</option>';
        timeSlotSelect.disabled = true;
        timeSlotSelect.classList.add('disabled-look');
    } finally {
        validateForm(); // Revalida o formulário
    }
}

// Função para agendar
async function bookAppointment() {
    hideError();
    setResponseMessage('Agendando...', false); // Mensagem temporária

    const serviceValue = document.getElementById('service').value;
    const selectedDate = document.getElementById('datePicker').value;
    const selectedTimeSlot = document.getElementById('timeSlot').value;
    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const observations = document.getElementById('observations').value;

    // Revalidação final antes de enviar, caso o usuário tente burlar
    if (!serviceValue || !selectedDate || !selectedTimeSlot || !customerName || !customerEmail) {
        showError("Por favor, preencha todos os campos obrigatórios.");
        setResponseMessage('Preencha todos os campos obrigatórios.', false);
        return;
    }

    const [serviceName, duration] = serviceValue.split('_');

    try {
        const response = await fetch(APPS_SCRIPT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'createBooking',
                data: {
                    serviceName: serviceName,
                    utcAppointmentStartStr: selectedTimeSlot,
                    customerName: customerName,
                    customerEmail: customerEmail,
                    customerPhone: customerPhone,
                    observations: observations,
                    durationMin: parseInt(duration)
                }
            })
        });

        const result = await response.json();

        if (result.success) {
            setResponseMessage(result.data, true); // Mensagem de sucesso
            // Limpa formulário após agendamento bem-sucedido
            document.getElementById('customerName').value = '';
            document.getElementById('customerEmail').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('observations').value = '';
            document.getElementById('service').value = ''; // Limpa o serviço selecionado
            document.getElementById('datePicker').value = ''; // Limpa a data selecionada
            document.getElementById('timeSlot').innerHTML = '<option value="">Selecione serviço e data</option>';
            document.getElementById('timeSlot').disabled = true;
            document.getElementById('timeSlot').classList.add('disabled-look');
            validateForm(); // Desabilita o botão Agendar
            setDefaultDate(); // Define a data padrão novamente
        } else {
            setResponseMessage('Erro ao agendar: ' + result.error, false); // Mensagem de erro
        }
    } catch (error) {
        setResponseMessage('Erro de rede ou comunicação: ' + error.message, false);
    }
}

// Função para definir a data atual como padrão no input date
function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Mês começa do 0
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('datePicker').value = `${yyyy}-${mm}-${dd}`;
}

// Executa funções ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    setDefaultDate(); // Define a data de hoje ao carregar
    getAvailableTimes(); // Busca horários para a data atual
    document.getElementById('service').addEventListener('change', validateForm);
    document.getElementById('datePicker').addEventListener('change', validateForm);
    document.getElementById('timeSlot').addEventListener('change', validateForm);
});
