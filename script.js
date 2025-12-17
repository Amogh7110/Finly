let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let monthlyChart, categoryChart;

// MONTH & YEAR DROPDOWN
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthSelector = document.getElementById("monthSelector");
months.forEach((m,i)=>{
    const opt = document.createElement("option");
    opt.value = i;
    opt.text = m;
    monthSelector.appendChild(opt);
});
monthSelector.value = new Date().getMonth();

const yearSelector = document.getElementById("yearSelector");
for(let y=new Date().getFullYear(); y>=2020; y--){
    const opt = document.createElement("option");
    opt.value = y;
    opt.text = y;
    yearSelector.appendChild(opt);
}
yearSelector.value = new Date().getFullYear();

// ADD TRANSACTION
function addTransaction(){
    const text = document.getElementById('text').value.trim();
    const amount = +document.getElementById('amount').value;
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;

    if(!text || amount<=0) return alert("Invalid input");

    transactions.push({
        id: Date.now(),
        text,
        amount: type==='income'?amount: (type==='expense'? -amount: -amount),
        type,
        category,
        date: new Date(),
        paid: type==='borrowed'? false : true,
        collected: type==='lent'? false : true
    });

    localStorage.setItem('transactions', JSON.stringify(transactions));
    document.getElementById('text').value='';
    document.getElementById('amount').value='';
    render();
}

// DELETE TRANSACTION
function deleteTransaction(id){
    transactions = transactions.filter(t=> t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    render();
}

// COLLECT / PAY
function collectMoney(id){
    transactions = transactions.map(t=>{
        if(t.id===id){ t.collected = true; t.type='income'; t.amount = Math.abs(t.amount); }
        return t;
    });
    localStorage.setItem('transactions', JSON.stringify(transactions));
    render();
}

function payMoney(id){
    transactions = transactions.map(t=>{
        if(t.id===id){ t.paid = true; t.type='expense'; t.amount = -Math.abs(t.amount); }
        return t;
    });
    localStorage.setItem('transactions', JSON.stringify(transactions));
    render();
}

// NUMBER ANIMATION
function animateNumber(elementId, start, end, duration=800){
    let startTime = null;
    const elem = document.getElementById(elementId);

    function step(timestamp){
        if(!startTime) startTime=timestamp;
        const progress = Math.min((timestamp - startTime)/duration, 1);
        const value = Math.floor(progress*(end-start)+start);
        elem.innerText = `₹${value}`;
        if(progress<1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
}

// RENDER
function render(){
    const selectedMonth = +monthSelector.value;
    const selectedYear = +yearSelector.value;

    const filtered = transactions.filter(t=>{
        const d = new Date(t.date);
        return d.getMonth()===selectedMonth && d.getFullYear()===selectedYear;
    });

    let income=0, expense=0, saving=0, pendingLent=0, pendingBorrowed=0;
    let categoryData={};
    const list = document.getElementById('list');
    list.innerHTML='';

    filtered.forEach(t=>{
        const li = document.createElement('li');

        if(t.type==='income' || (t.type==='lent' && t.collected)) li.className='plus';
        else if(t.type==='expense' || (t.type==='borrowed' && t.paid)) li.className='minus';
        else if(t.type==='lent' && !t.collected) li.className='lent';
        else if(t.type==='borrowed' && !t.paid) li.className='borrowed';

        let actionBtn='';
        if(t.type==='lent' && !t.collected) actionBtn=`<button class="collect-btn" onclick="collectMoney(${t.id})">Collect</button>`;
        if(t.type==='borrowed' && !t.paid) actionBtn=`<button class="pay-btn" onclick="payMoney(${t.id})">Pay</button>`;

        li.innerHTML=`
            <div class="transaction-info">
                <span>${t.text} (${t.type})</span>
                <span>₹${Math.abs(t.amount)}</span>
            </div>
            ${actionBtn}
            <button class="delete-btn" onclick="deleteTransaction(${t.id})">🗑️</button>
        `;
        list.appendChild(li);

        if(t.type==='income' || (t.type==='lent' && t.collected)) income += Math.abs(t.amount);
        else if(t.type==='expense' || (t.type==='borrowed' && t.paid)) expense += Math.abs(t.amount);
        else if(t.type==='lent' && !t.collected) pendingLent += Math.abs(t.amount);
        else if(t.type==='borrowed' && !t.paid) pendingBorrowed += Math.abs(t.amount);

        if(t.type!=='income') categoryData[t.category]=(categoryData[t.category]||0)+Math.abs(t.amount);
    });

    saving = income - expense;

    animateNumber('income', parseInt(document.getElementById('income').innerText.replace('₹','')), income);
    animateNumber('expense', parseInt(document.getElementById('expense').innerText.replace('₹','')), expense);
    animateNumber('saving', parseInt(document.getElementById('saving').innerText.replace('₹','')), saving);
    animateNumber('pendingLent', parseInt(document.getElementById('pendingLent').innerText.replace('₹','')), pendingLent);
    animateNumber('pendingBorrowed', parseInt(document.getElementById('pendingBorrowed').innerText.replace('₹','')), pendingBorrowed);

    const totalSaving = transactions.filter(t=>t.type==='income' || (t.type==='lent' && t.collected)).reduce((a,b)=>a+Math.abs(b.amount),0)
                        - transactions.filter(t=>t.type==='expense' || (t.type==='borrowed' && t.paid)).reduce((a,b)=>a+Math.abs(b.amount),0);
    animateNumber('balance', parseInt(document.getElementById('balance').innerText.replace('₹','')), totalSaving);

    updateCharts(income, expense, saving, categoryData);
}

// CHARTS
function updateCharts(income, expense, saving, categoryData){
    if(monthlyChart) monthlyChart.destroy();
    if(categoryChart) categoryChart.destroy();

    monthlyChart = new Chart(document.getElementById('monthlyChart'),{
        type:'bar',
        data:{
            labels:['Income','Expense','Savings'],
            datasets:[{
                data:[income,expense,saving],
                backgroundColor:['#22c55e','#ef4444','#38bdf8']
            }]
        },
        options:{
            plugins:{legend:{display:false}},
            animation: { duration: 1000, easing: 'easeOutBounce' }
        }
    });

    categoryChart = new Chart(document.getElementById('categoryChart'),{
        type:'pie',
        data:{
            labels:Object.keys(categoryData),
            datasets:[{
                data:Object.values(categoryData),
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#38bdf8', '#f472b6', '#a855f7'] // Personal included
            }]
        },
        options:{
            animation: { duration: 1200, easing: 'easeOutCubic' }
        }
    });
}

// DOWNLOAD CSV
function downloadMonthlyCSV(){
    const month = +monthSelector.value;
    const year = +yearSelector.value;
    const data = transactions.filter(t=> new Date(t.date).getMonth()===month && new Date(t.date).getFullYear()===year);

    if(!data.length) return alert("No data for selected month");

    let csv="Date,Description,Category,Type,Amount\n";
    data.forEach(t=>{
        csv+=`${new Date(t.date).toLocaleDateString()},${t.text},${t.category},${t.type},${Math.abs(t.amount)}\n`;
    });

    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`Expense_${months[month]}_${year}.csv`;
    a.click();
}

function downloadYearlyCSV(){
    const year = +yearSelector.value;
    const data = transactions.filter(t=> new Date(t.date).getFullYear()===year);

    if(!data.length) return alert("No data for selected year");

    let csv="Date,Description,Category,Type,Amount\n";
    data.forEach(t=>{
        csv+=`${new Date(t.date).toLocaleDateString()},${t.text},${t.category},${t.type},${Math.abs(t.amount)}\n`;
    });

    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`Expense_Year_${year}.csv`;
    a.click();
}

// INITIAL RENDER
render();

// Re-render on month/year change
monthSelector.addEventListener('change', render);
yearSelector.addEventListener('change', render);
