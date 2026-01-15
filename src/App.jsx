import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  ShoppingCart, AlertTriangle, CheckCircle, MapPin, Plus, Trash2, ArrowRight, 
  List, Package, Search, Save, Calendar, Clock, ChevronDown, ChevronUp, 
  History, RotateCcw, ClipboardList, Edit, XCircle, ChevronLeft, ChevronRight, 
  CalendarDays, LayoutDashboard, TrendingUp, Store, Copy, Check, Share2, 
  Phone, FileText, Truck, X
} from 'lucide-react';

// --- COMPONENTES UI BÁSICOS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = "gray" }) => {
  const colors = {
    red: "bg-red-50 text-red-600 border-red-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100"
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${colors[color]}`}>{children}</span>;
};

// --- APLICAÇÃO PRINCIPAL ---
export default function GestaoCompras() {
  
  // --- ESTADO ---
  const [insumos, setInsumos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  // ADICIONE ESTA LINHA AQUI:
  const [itensNoCarrinho, setItensNoCarrinho] = useState([]);

  // --- CARREGAR DADOS ---
  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    setLoading(true);
    
    // Buscar Insumos
    const { data: dataInsumos } = await supabase.from('insumos').select('*').order('nome');
    if (dataInsumos) setInsumos(dataInsumos);

    // Buscar Fornecedores
    const { data: dataFornecedores } = await supabase.from('fornecedores').select('*').order('nome');
    if (dataFornecedores) setFornecedores(dataFornecedores);

    // Buscar Histórico
    const { data: dataHistorico } = await supabase.from('historico_compras').select('*').order('id', { ascending: false });
    if (dataHistorico) {
      const historicoFormatado = dataHistorico.map(h => ({
        ...h,
        data: h.data_registro,
        hora: h.hora_registro,
        totalItens: h.total_itens,
        itens: h.itens_json
      }));
      setHistorico(historicoFormatado);
    }
    setLoading(false);
  };

  const ordemRota = useMemo(() => fornecedores.map(f => f.nome), [fornecedores]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('lista'); 
  
  // Estados de Cadastro
  const [subTabCadastro, setSubTabCadastro] = useState('produtos');
  const [novoItem, setNovoItem] = useState({ nome: '', qtd_atual: 0, qtd_minima: 0, unidade: 'kg', local: 'Moranguinho' });
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', telefone: '', endereco: '', obs: '' });
  
  // Filtros
  const [filtroEstoque, setFiltroEstoque] = useState('');
  const [filtroDiario, setFiltroDiario] = useState(''); // NOVO: Filtro da aba diário

  const [editingId, setEditingId] = useState(null);
  const [editingFornecedorId, setEditingFornecedorId] = useState(null);
  
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [selectedFornecedores, setSelectedFornecedores] = useState([]);
  
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const formatDateKey = (date) => date ? date.toLocaleDateString('pt-BR') : "";
  const isToday = formatDateKey(selectedDate) === formatDateKey(new Date());
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handlePrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); };
  const handleNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); };

  const toggleHistoryExpand = (id) => {
    if (expandedHistoryId === id) { setExpandedHistoryId(null); } 
    else { setExpandedHistoryId(id); setSelectedFornecedores([]); }
  };

  const toggleFornecedorSelection = (fornecedor) => {
    if (selectedFornecedores.includes(fornecedor)) { setSelectedFornecedores(selectedFornecedores.filter(f => f !== fornecedor)); } 
    else { setSelectedFornecedores([...selectedFornecedores, fornecedor]); }
  };

  // ADICIONE ESTA FUNÇÃO NOVA AQUI:
  const toggleCarrinho = async (item) => {
  // Se o item já está no carrinho, não fazemos nada ou desmarcamos (opcional)
  if (itensNoCarrinho.includes(item.id)) {
    setItensNoCarrinho(itensNoCarrinho.filter(id => id !== item.id));
    return;
  }

  // AÇÃO DE ATALHO:
  // Se você clicou na box, o sistema entende que o item está OK
  // 1. Adiciona o efeito visual de riscado
  setItensNoCarrinho([...itensNoCarrinho, item.id]);

  // 2. Atualiza no banco de dados para a quantidade mínima (zerando a necessidade de compra)
  const novaQtd = parseFloat(item.qtd_minima);
  
  // Atualiza localmente para sumir o aviso de "falta"
  setInsumos(prev => prev.map(i => i.id === item.id ? { ...i, qtd_atual: novaQtd } : i));
  
  // Salva no Supabase
  await supabase.from('insumos').update({ qtd_atual: novaQtd }).eq('id', item.id);
  
  showToast(`${item.nome} marcado como OK!`);
};

  const handleAddProduto = async (e) => {
  e.preventDefault();
  
  // ... lógica de enviar para o Supabase ...

  // APÓS O SUCESSO:
  setNome('');       // Limpa o nome para o próximo
  setQtdMinima('');  // Limpa a quantidade
  setUnidade('un');  // Reseta a unidade (se quiser)

  // COMENTE OU REMOVA A LINHA ABAIXO:
  // setLocal('Moranguinho'); 
  
  // Assim, o estado 'local' continuará com o último valor que você selecionou!
  
  setModalAberto(false); // Fecha o modal
  fetchProdutos();       // Atualiza a lista
};

const handleExcluirHistorico = async (id) => {
  if (!confirm('Deseja realmente excluir este relatório do histórico?')) return;

  try {
    const { error } = await supabase
      .from('historico_compras') // Certifique-se que o nome da tabela está correto
      .delete()
      .eq('id', id);

    if (error) throw error;

    showToast('Relatório excluído!');
    // Atualiza a lista local removendo o item excluído
    setHistorico(prev => prev.filter(item => item.id !== id));
  } catch (error) {
    console.error('Erro ao excluir:', error);
    showToast('Erro ao excluir relatório', 'error');
  }
};

  const copiarPedidoWhatsApp = (data, fornecedorAlvo) => {
  // 1. Cabeçalho do texto
  let texto = `*PEDIDO - ${fornecedorAlvo.toUpperCase()}*\n`;
  texto += `Data: ${formatDateKey(data)}\n`;
  texto += `------------------------------\n\n`;
  texto += `*📍 ${fornecedorAlvo.toUpperCase()}*\n`;

  // 2. Filtra os itens desse fornecedor que precisam comprar
  const itens = historico[data].itens.filter(
    item => item.fornecedor === fornecedorAlvo && item.precisaComprar
  );

  if (itens.length === 0) {
    alert("Não há itens para comprar deste fornecedor nesta data.");
    return;
  }

  // 3. Monta a lista de itens
  itens.forEach(item => {
    texto += `- ${item.nome}: *${item.falta % 1 !== 0 ? item.falta.toFixed(1) : item.falta} ${item.unidade}*\n`;
  });

  // 4. Copia para a área de transferência
  navigator.clipboard.writeText(texto).then(() => {
    alert(`Pedido de ${fornecedorAlvo} copiado!`);
  });
};

  // --- LÓGICA DE DADOS ---
  const dadosLista = useMemo(() => {
    if (!isToday) {
      const registroHistorico = historico.find(h => h.data === formatDateKey(selectedDate));
      if (registroHistorico) {
        const agrupadoHist = {};
        ordemRota.forEach(local => agrupadoHist[local] = []);
        agrupadoHist['Outros'] = [];

        registroHistorico.itens.forEach(item => {
          const localKey = ordemRota.includes(item.local) ? item.local : 'Outros';
          if (!agrupadoHist[localKey]) agrupadoHist[localKey] = [];
          agrupadoHist[localKey].push({ ...item, precisaComprar: true, isHistorical: true });
        });
        const locaisExibicao = ordemRota.filter(l => agrupadoHist[l] && agrupadoHist[l].length > 0);
        if (agrupadoHist['Outros'].length > 0) locaisExibicao.push('Outros');
        return { grupos: agrupadoHist, locais: locaisExibicao, totalItensParaComprar: registroHistorico.totalItens, hasData: true };
      }
      return { hasData: false };
    }

    const agrupado = {};
    ordemRota.forEach(l => agrupado[l] = []);
    agrupado['Outros'] = [];
    let totalItensParaComprar = 0;
    const itensParaComprarFlat = [];

    insumos.forEach(item => {
  const localKey = ordemRota.includes(item.local) ? item.local : 'Outros';
  const faltaCalculada = parseFloat(item.qtd_minima) - parseFloat(item.qtd_atual);
  
  let faltaFinal = faltaCalculada > 0 ? faltaCalculada : 0;

  // Lógica de Arredondamento para itens inteiros (Balde, Pacote, Unidade)
  const unidadesFracionadas = ['kg', 'g', 'kg.', 'g.'];
  if (faltaFinal > 0 && !unidadesFracionadas.includes(item.unidade.toLowerCase())) {
    faltaFinal = Math.ceil(faltaFinal); // Arredonda 0.1 para 1, por exemplo.
  }

  const precisaComprar = faltaFinal > 0;
  if (precisaComprar) {
    totalItensParaComprar++;
    itensParaComprarFlat.push({ ...item, falta: faltaFinal });
  }
  agrupado[localKey].push({ ...item, falta: faltaFinal, precisaComprar });
});

    const locaisExibicao = ordemRota.filter(l => agrupado[l].length > 0);
    if (agrupado['Outros'].length > 0) locaisExibicao.push('Outros');

    return { grupos: agrupado, locais: locaisExibicao, totalItensParaComprar, itensFlat: itensParaComprarFlat, hasData: true };
  }, [insumos, ordemRota, selectedDate, historico, isToday]);

  const dadosDashboard = useMemo(() => {
    const itemStats = {};
    const localStats = {};
    let totalCompras = historico.length;
    let totalItensComprados = 0;

    insumos.forEach(i => itemStats[i.nome] = { count: 0, qty: 0, nome: i.nome, unit: i.unidade, local: i.local });

    historico.forEach(r => {
      totalItensComprados += parseFloat(r.totalItens || 0);
      r.itens.forEach(i => {
        if (!itemStats[i.nome]) itemStats[i.nome] = { count: 0, qty: 0, nome: i.nome, unit: i.unidade, local: i.local };
        itemStats[i.nome].count += 1;
        itemStats[i.nome].qty += parseFloat(i.qtd);
        if (!localStats[i.local]) localStats[i.local] = 0;
        localStats[i.local] += 1;
      });
    });

    const topItems = Object.values(itemStats).sort((a, b) => b.count - a.count).slice(0, 5).filter(i => i.count > 0);
    const topLocais = Object.entries(localStats).sort(([, a], [, b]) => b - a).map(([nome, count]) => ({ nome, count }));

    return { totalCompras, totalItensComprados, topItems, topLocais, mediaItensPorCompra: totalCompras > 0 ? (totalItensComprados / totalCompras).toFixed(1) : 0 };
  }, [historico, insumos]);

  // --- AÇÕES COM MODAL E SUPABASE ---
  const openConfirmModal = (action, id = null) => { 
    setModalAction(action); 
    if(id) setItemParaExcluir(id);
    setModalOpen(true); 
  };

  const handleConfirmAction = async () => {
    setModalOpen(false);
    
    // --- RESETAR ESTOQUE ---
    if (modalAction === 'reset') {
      const updates = insumos.map(item => ({ ...item, qtd_atual: 0 }));
      setInsumos(updates); 
      for (const item of updates) {
         await supabase.from('insumos').update({ qtd_atual: 0 }).eq('id', item.id);
      }
      showToast('Estoque zerado com sucesso!', 'success');
    } 
    
    // --- SALVAR HISTÓRICO ---
    else if (modalAction === 'save') {
      const agora = new Date();
      const dataHoje = formatDateKey(agora);
      const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const novoHistorico = {
        data_registro: dataHoje,
        hora_registro: horaHoje,
        total_itens: dadosLista.totalItensParaComprar,
        itens_json: (dadosLista.itensFlat || []).map(item => ({
          nome: item.nome,
          qtd: (parseFloat(item.falta) || 0).toFixed(2),
          estoque_no_dia: item.qtd_atual,              // O que TINHA na prateleira (NOVO)
          minimo_esperado: item.qtd_minima,             // O que o sistema pedia (NOVO)
          unidade: item.unidade,
          local: item.local
        }))
      };

      const { data, error } = await supabase.from('historico_compras').insert([novoHistorico]).select();

      if (!error && data) {
         const histFormatado = {
             ...data[0],
             data: data[0].data_registro,
             hora: data[0].hora_registro,
             totalItens: data[0].total_itens,
             itens: data[0].itens_json
         };
         setHistorico([histFormatado, ...historico]);
         showToast('Lista salva no histórico!', 'success');
         setTimeout(() => setActiveTab('historico'), 500);
      } else {
         showToast('Erro ao salvar histórico', 'error');
      }
    }
    
    // --- EXCLUIR ITEM ---
    else if (modalAction === 'delete_item') {
        if (itemParaExcluir) {
            const { error } = await supabase.from('insumos').delete().eq('id', itemParaExcluir);
            if (!error) {
                setInsumos(insumos.filter(item => item.id !== itemParaExcluir));
                showToast('Produto excluído!', 'success');
            }
            setItemParaExcluir(null);
        }
    }

    // --- EXCLUIR FORNECEDOR ---
    else if (modalAction === 'delete_fornecedor') {
      if (itemParaExcluir) {
          const { error } = await supabase.from('fornecedores').delete().eq('id', itemParaExcluir);
          if (!error) {
              setFornecedores(fornecedores.filter(f => f.id !== itemParaExcluir));
              showToast('Fornecedor removido!', 'success');
          }
          setItemParaExcluir(null);
      }
    }
  };

  const copiarParaClipboard = (texto) => {
    try {
      navigator.clipboard.writeText(texto);
      showToast('Copiado para o WhatsApp!', 'success');
    } catch (err) {
      showToast('Erro ao copiar', 'error');
    }
  };

  const handleCopiarListaGeral = (registro) => {
    let texto = `*RELATÓRIO DE COMPRAS - ${registro.data}*\nGerado às: ${registro.hora}\n------------------------------\n`;
    const itensPorLocal = {};
    ordemRota.forEach(r => itensPorLocal[r] = []);
    itensPorLocal['Outros'] = [];

    registro.itens.forEach(item => {
      const localKey = ordemRota.includes(item.local) ? item.local : 'Outros';
      if (!itensPorLocal[localKey]) itensPorLocal[localKey] = [];
      itensPorLocal[localKey].push(item);
    });

    let temItens = false;
    Object.keys(itensPorLocal).forEach(local => {
      if(itensPorLocal[local].length > 0) {
        temItens = true;
        texto += `\n*📍 ${local.toUpperCase()}*\n`;
        itensPorLocal[local].forEach(item => {
          texto += `- ${item.nome}: *${parseFloat(item.qtd)} ${item.unidade}*\n`;
        });
      }
    });
    if (!temItens) texto += "\n(Lista Vazia)\n";
    copiarParaClipboard(texto);
  };

  const handleCopiarSelecionados = (registro) => {
  if (selectedFornecedores.length === 0) return;

  let textoFinal = "";

  selectedFornecedores.forEach((forn, index) => {
    // Cabeçalho individual para cada fornecedor selecionado
    textoFinal += `*PEDIDO - ${forn.toUpperCase()}*\n`;
    textoFinal += `Data: ${registro.data}\n`;
    textoFinal += `------------------------------\n\n`;
    textoFinal += `*📍 ${forn.toUpperCase()}*\n`;

    // Filtra os itens desse fornecedor específico dentro do registro
    const itensDoForn = registro.itens.filter(i => i.local === forn);

    itensDoForn.forEach(item => {
      textoFinal += `- ${item.nome}: *${item.qtd} ${item.unidade}*\n`;
    });

    // Adiciona uma separação se houver mais de um fornecedor selecionado
    if (index < selectedFornecedores.length - 1) {
      textoFinal += `\n\n`;
    }
  });

  // Copia para o teclado do celular/PC
  navigator.clipboard.writeText(textoFinal).then(() => {
    alert("Pedido(s) formatado(s) e copiado(s)!");
    setSelectedFornecedores([]); // Limpa a seleção após copiar
  });
};

  // --- CRUD ITEM (COM SUPABASE) ---
  const handleSalvarOuAtualizarItem = async () => {
    if (!novoItem.nome) return;
    
    const itemPayload = {
        nome: novoItem.nome,
        qtd_atual: parseFloat(novoItem.qtd_atual) || 0,
        qtd_minima: parseFloat(novoItem.qtd_minima) || 0,
        unidade: novoItem.unidade,
        local: novoItem.local
    };

    if (editingId) {
      const { error } = await supabase.from('insumos').update(itemPayload).eq('id', editingId);
      if (!error) {
          setInsumos(insumos.map(i => i.id === editingId ? { ...itemPayload, id: editingId } : i));
          setEditingId(null);
          showToast('Produto atualizado!');
      }
    } else {
      const { data, error } = await supabase.from('insumos').insert([itemPayload]).select();
      if (!error && data) {
          setInsumos([...insumos, data[0]]);
          showToast('Produto adicionado!');
      }
    }
    setNovoItem({ 
  nome: '', 
  qtd_atual: 0, 
  qtd_minima: 0, 
  unidade: 'kg', 
  local: novoItem.local // Mantém o valor que já estava selecionado
});

if (editingId) setEditingId(null);
showToast(editingId ? 'Produto atualizado!' : 'Produto adicionado!');
  };

  const handleEditarItem = (item) => { 
      setEditingId(item.id); 
      setNovoItem(item); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
      setActiveTab('estoque'); 
  };
  
  const handleSolicitarExclusao = (id) => { openConfirmModal('delete_item', id); };

  const handleAtualizarEstoque = async (id, valor) => { 
    if (!isToday) return; 
    const novaQtd = Math.max(0, parseFloat(valor) || 0);
    setInsumos(insumos.map(i => i.id === id ? { ...i, qtd_atual: novaQtd } : i));
    await supabase.from('insumos').update({ qtd_atual: novaQtd }).eq('id', id);
  };

  const handleMarcarComoOk = async (id) => {
    if (!isToday) return;
    const item = insumos.find(i => i.id === id);
    if(item) {
        const novaQtd = parseFloat(item.qtd_minima);
        setInsumos(insumos.map(i => i.id === id ? { ...i, qtd_atual: novaQtd } : i));
        await supabase.from('insumos').update({ qtd_atual: novaQtd }).eq('id', id);
    }
  };

  // --- CRUD FORNECEDORES (COM SUPABASE) ---
  const handleSalvarOuAtualizarFornecedor = async () => {
    if (!novoFornecedor.nome) return;
    
    if (editingFornecedorId) {
      const { error } = await supabase.from('fornecedores').update(novoFornecedor).eq('id', editingFornecedorId);
      if(!error) {
          setFornecedores(fornecedores.map(f => f.id === editingFornecedorId ? { ...novoFornecedor, id: editingFornecedorId } : f));
          setEditingFornecedorId(null);
          showToast('Fornecedor atualizado!');
      }
    } else {
      const { data, error } = await supabase.from('fornecedores').insert([novoFornecedor]).select();
      if(!error && data) {
          setFornecedores([...fornecedores, data[0]]);
          showToast('Fornecedor adicionado!');
      }
    }
    setNovoFornecedor({ nome: '', telefone: '', endereco: '', obs: '' });
  };

  const handleEditarFornecedor = (f) => { setEditingFornecedorId(f.id); setNovoFornecedor(f); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleExcluirFornecedor = (id) => { openConfirmModal('delete_fornecedor', id); }

  const insumosFiltrados = insumos.filter(i => 
    i.nome.toLowerCase().includes(filtroEstoque.toLowerCase()) ||
    i.local.toLowerCase().includes(filtroEstoque.toLowerCase())
  );

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-emerald-600 animate-pulse font-bold">Carregando seus dados...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-24 md:pb-0 relative">
      
      {notification.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold text-white flex items-center gap-2 animate-bounce ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'}`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {notification.message}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {modalAction === 'save' ? 'Finalizar Lista?' : 
               modalAction === 'reset' ? 'Zerar Estoque?' : 
               modalAction && modalAction.includes('delete') ? 'Confirmar Exclusão?' : ''}
            </h3>
            <p className="text-gray-500 mb-6">
              {modalAction === 'save' ? `Salvar ${dadosLista.totalItensParaComprar} itens no histórico?` : 
               modalAction === 'reset' ? 'Isso vai zerar a contagem de todos os itens.' : 'Essa ação é irreversível.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold text-gray-600 rounded-xl hover:bg-gray-200">Cancelar</button>
              <button onClick={handleConfirmAction} className={`flex-1 py-3 font-bold text-white rounded-xl shadow-lg ${modalAction && modalAction.includes('delete') ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-emerald-700 text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="text-emerald-100" /> Compras</h1>
          <div className="flex items-center gap-2 bg-emerald-800/50 p-1 rounded-lg border border-emerald-600/30">
             <button onClick={handlePrevDay} className="p-2 hover:bg-emerald-600/50 rounded-lg text-emerald-100"><ChevronLeft size={20} /></button>
             <div className="text-center min-w-[100px] cursor-pointer relative group">
               <div className="text-[10px] uppercase text-emerald-300 font-bold tracking-wider">{isToday ? 'HOJE' : dayNames[selectedDate.getDay()]}</div>
               <div className="font-bold text-lg leading-none text-white">{formatDateKey(selectedDate)}</div>
               <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { if(e.target.value) { const p = e.target.value.split('-'); setSelectedDate(new Date(p[0], p[1]-1, p[2])); }}} />
             </div>
             <button onClick={handleNextDay} className={`p-2 rounded-lg text-emerald-100 ${isToday ? 'opacity-30' : 'hover:bg-emerald-600/50'}`} disabled={isToday}><ChevronRight size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-4 p-1 bg-white rounded-xl shadow-sm border border-gray-100 sticky top-24 z-10 mt-2">
          {[{id: 'lista', icon: CalendarDays, label: 'Diário', short: 'Hoje'}, {id: 'historico', icon: History, label: 'Histórico', short: 'Hist.'}, {id: 'dashboard', icon: LayoutDashboard, label: 'Dash', short: 'Dash'}, {id: 'estoque', icon: Package, label: 'Cadastros', short: 'Itens'}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-2.5 text-xs md:text-sm font-bold rounded-lg flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 transition-all ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-gray-400 hover:text-gray-600'}`}>
              <tab.icon size={18} />
              <span className="hidden md:inline">{tab.label}</span><span className="md:hidden">{tab.short}</span>
              {tab.id === 'lista' && isToday && dadosLista.totalItensParaComprar > 0 && <span className="bg-red-500 text-white text-[10px] h-4 w-4 flex items-center justify-center rounded-full">{dadosLista.totalItensParaComprar}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'lista' && (
          <div className="space-y-4 animate-fade-in">
            {!isToday && !dadosLista.hasData && (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4"><CalendarDays size={32} /></div>
                <h3 className="text-lg font-bold text-gray-700">Sem registros para {formatDateKey(selectedDate)}</h3>
                <button onClick={() => setSelectedDate(new Date())} className="mt-4 text-emerald-600 font-bold text-sm hover:underline bg-emerald-50 px-4 py-2 rounded-lg">Voltar para Hoje</button>
              </div>
            )}
            
            {isToday && (
              <>
                <div className="relative mb-2">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Filtrar por produto ou fornecedor..." 
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 text-sm outline-none shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
                      value={filtroDiario} 
                      onChange={e => setFiltroDiario(e.target.value)} 
                    />
                    {filtroDiario && (
                      <button 
                        onClick={() => setFiltroDiario('')} 
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <button onClick={() => openConfirmModal('reset')} className="w-full bg-white border border-gray-300 text-gray-600 px-4 py-3 rounded-lg font-bold shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2">
                    <RotateCcw size={18} /> Zerar Contagem
                  </button>
                  <button onClick={() => openConfirmModal('save')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-bold shadow-md shadow-emerald-200 flex items-center justify-center gap-2">
                    <Save size={18} /> Finalizar & Salvar
                  </button>
                </div>
              </>
            )}

            {dadosLista.hasData && (
              <>
                {/* Só mostra os atalhos de paradas se NÃO tiver filtro, para não poluir */}
                {!filtroDiario && (
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-wrap gap-2 text-xs">
                    <span className="font-bold text-gray-500 uppercase flex items-center gap-1"><MapPin size={12}/> Paradas:</span>
                    {dadosLista.locais.map((local, idx) => (
                      <span key={local} className={`${dadosLista.grupos[local].some(i => i.precisaComprar) ? 'text-gray-800 font-bold' : 'text-gray-400'} flex items-center`}>
                          {idx + 1}. {local} {idx < dadosLista.locais.length - 1 && <ArrowRight size={10} className="ml-1 text-gray-300"/>}
                      </span>
                    ))}
                  </div>
                )}

                {dadosLista.locais.map((local, index) => {
                  // LÓGICA DE FILTRO
                  const itensDoLocal = dadosLista.grupos[local];
                  const itensParaMostrar = filtroDiario 
                    ? itensDoLocal.filter(item => 
                        item.nome.toLowerCase().includes(filtroDiario.toLowerCase()) || 
                        local.toLowerCase().includes(filtroDiario.toLowerCase())
                      )
                    : itensDoLocal;

                  if (filtroDiario && itensParaMostrar.length === 0) return null;

                  return (
                    <div key={local} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 p-2 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2"><span className="bg-emerald-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">{index + 1}</span><h3 className="font-bold text-gray-700 text-sm uppercase">{local}</h3></div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {itensParaMostrar.map(item => (
                          <div 
    key={item.id} 
    onClick={() => isToday && item.precisaComprar ? toggleCarrinho(item) : null}
    className={`grid grid-cols-12 p-2 items-center text-sm transition-all cursor-pointer border-b border-gray-50
      ${item.precisaComprar ? 'bg-red-50/20' : 'bg-white'}
      ${itensNoCarrinho.includes(item.id) ? 'opacity-40 bg-gray-100' : ''}
    `}
  >
    {/* COLUNA 1: CHECKBOX + NOME */}
    <div className="col-span-5 md:col-span-6 pr-1 leading-tight flex items-center gap-2">
      {isToday && item.precisaComprar && (
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0
          ${itensNoCarrinho.includes(item.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}
        `}>
          {itensNoCarrinho.includes(item.id) && <Check size={14} className="text-white" />}
        </div>
      )}
      
      <div>
        <span className={`font-bold block ${itensNoCarrinho.includes(item.id) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
          {item.nome}
        </span>
        {isToday && <span className="text-[10px] text-gray-400">Min: {item.qtd_minima} {item.unidade}</span>}
      </div>
    </div>

    {/* COLUNA 2: BOTÕES +/- (Com stopPropagation para não ativar o carrinho ao clicar no botão) */}
    <div className="col-span-4 md:col-span-3 flex justify-center items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {isToday ? (
        <div className="flex items-center bg-white border border-gray-200 rounded h-8 shadow-sm">
          <button onClick={() => handleAtualizarEstoque(item.id, Math.max(0, parseFloat(item.qtd_atual) - 1))} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-r border-gray-100 rounded-l">-</button>
          <input type="number" className="w-10 text-center outline-none font-bold text-gray-700 text-sm bg-transparent" value={item.qtd_atual} onChange={(e) => handleAtualizarEstoque(item.id, e.target.value)} />
          <button onClick={() => handleAtualizarEstoque(item.id, parseFloat(item.qtd_atual) + 1)} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-l border-gray-100 rounded-r">+</button>
        </div>
      ) : <span className="text-xs text-gray-400 italic">Registrado</span>}
    </div>

    {/* COLUNA 3: QUANTIDADE QUE FALTA */}
<div className="col-span-3 md:col-span-3 text-right pl-2">
  {item.precisaComprar ? (
    <div className={`px-2 py-1 rounded inline-block font-bold min-w-[3rem] text-center shadow-sm 
      ${itensNoCarrinho.includes(item.id) ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-700'}
    `}>
      {isToday ? '+' : ''}
      {/* Se for KG ou G mostra 1 casa decimal, se for Unidade/Balde mostra número inteiro */}
      {['kg', 'g'].includes(item.unidade.toLowerCase()) 
        ? Number(item.falta).toFixed(1) 
        : Math.ceil(item.falta)
      } 
      <span className="text-[10px] ml-1">{item.unidade}</span>
    </div>
  ) : <CheckCircle size={20} className="text-emerald-300 inline-block" />}
</div>
  </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4 animate-fade-in">
            {historico.length === 0 ? (
               <div className="text-center py-12 text-gray-400"><History size={48} className="mx-auto mb-2 opacity-20" /><p>Nenhum histórico de compras.</p></div>
            ) : (
              historico.map((registro) => {
                const isExpanded = expandedHistoryId === registro.id;
                const fornecedoresDoRegistro = [...new Set(registro.itens.map(i => i.local))];
                return (
                  <div key={registro.id} className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                    <button 
  onClick={() => toggleHistoryExpand(registro.id)} 
  className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
>
  {/* LADO ESQUERDO: INFORMAÇÕES DO RELATÓRIO */}
  <div className="flex items-center gap-3">
    <div className="bg-purple-100 text-purple-700 p-2 rounded-lg">
      <Calendar size={20} />
    </div>
    <div className="text-left">
      <h3 className="font-bold text-gray-800 text-lg">{registro.data}</h3>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Clock size={10} /> {registro.hora} • {registro.totalItens} itens
      </p>
    </div>
  </div>

  {/* LADO DIREITO: BOTÕES DE AÇÃO */}
  <div className="flex items-center gap-4">
    {/* ÍCONE DE LIXEIRA PARA EXCLUIR */}
    <div 
      onClick={(e) => {
        e.stopPropagation(); // Impede que o card abra ao clicar na lixeira
        handleExcluirHistorico(registro.id);
      }} 
      className="text-gray-300 hover:text-red-500 transition-colors p-2"
      title="Excluir este relatório"
    >
      <Trash2 size={20} />
    </div>
    
    {/* SETA DE EXPANDIR */}
    <div className="text-gray-400">
      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
    </div>
  </div>
</button>
                    {isExpanded && (
                      <div className="bg-purple-50/30 border-t border-purple-50 p-4">
                        <div className="mb-6 bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                          <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 flex items-center gap-1"><Share2 size={12}/> Opções de Envio</p>
                          <button onClick={() => handleCopiarListaGeral(registro)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors text-sm mb-3">
                              <Copy size={16} /> Copiar Relatório Completo (Gerente)
                          </button>
                          <div className="border-t border-gray-100 my-3"></div>
                          <p className="text-[10px] font-bold text-gray-400 mb-2">SELECIONE OS FORNECEDORES PARA COPIAR:</p>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                              {fornecedoresDoRegistro.map(forn => {
                                  const isSelected = selectedFornecedores.includes(forn);
                                  return (
                                      <button key={forn} onClick={() => toggleFornecedorSelection(forn)} className={`border text-xs font-bold py-2 px-2 rounded-lg flex items-center gap-2 transition-colors ${isSelected ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'}`}>{isSelected && <Check size={10} className="text-white" />}</div>{forn}
                                      </button>
                                  )
                              })}
                          </div>
                          <button onClick={() => handleCopiarSelecionados(registro)} disabled={selectedFornecedores.length === 0} className={`w-full font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all text-sm ${selectedFornecedores.length > 0 ? 'bg-purple-600 hover:bg-purple-700 text-white transform hover:scale-[1.02]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                              <Copy size={16} /> Copiar Selecionados
                          </button>
                        </div>
                        <div className="space-y-2">
                          {registro.itens.map((item, idx) => (
  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-purple-100 shadow-sm">
    <div className="flex flex-col">
      <span className="text-sm font-bold text-gray-700">{item.nome}</span>
      <span className="text-[10px] text-gray-400 uppercase italic">
        Tinha: {item.estoque_no_dia} | Mínimo: {item.minimo_esperado}
      </span>
    </div>
    
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{item.local}</span>
      <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
        +{item.qtd} {item.unidade}
      </span>
    </div>
  </div>
))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-gray-400 text-xs uppercase font-bold mb-1">Total Compras</div><div className="text-2xl font-black text-orange-600">{dadosDashboard.totalCompras}</div></div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div className="text-gray-400 text-xs uppercase font-bold mb-1">Média Itens/Compra</div><div className="text-2xl font-black text-blue-600">{dadosDashboard.mediaItensPorCompra}</div></div>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-600"/><h3 className="font-bold text-gray-700">Top 5 Mais Pedidos</h3></div>
               <div className="p-4 space-y-4">{dadosDashboard.topItems.map((item, idx) => (<div key={idx} className="relative"><div className="flex justify-between text-sm mb-1 z-10 relative"><span className="font-bold text-gray-700">{idx+1}. {item.nome}</span><span className="text-gray-500 text-xs font-bold">{item.count}x</span></div><div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(item.count / dadosDashboard.topItems[0].count) * 100}%` }}></div></div></div>))}</div>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2"><Store size={18} className="text-blue-600"/><h3 className="font-bold text-gray-700">Top Locais</h3></div>
               <div className="p-4 space-y-3">{dadosDashboard.topLocais.map((local, idx) => (<div key={idx} className="flex items-center justify-between"><span className="text-sm font-medium text-gray-600">{local.nome}</span><span className="text-xs font-bold text-blue-600">{local.count} itens</span></div>))}</div>
             </div>
          </div>
        )}

        {activeTab === 'estoque' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
              <button onClick={() => setSubTabCadastro('produtos')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${subTabCadastro === 'produtos' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}><Package size={16} /> Produtos</button>
              <button onClick={() => setSubTabCadastro('fornecedores')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${subTabCadastro === 'fornecedores' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}><Truck size={16} /> Fornecedores</button>
            </div>

            {subTabCadastro === 'produtos' && (
              <>
                <Card className={`bg-white border transition-colors ${editingId ? 'border-orange-200 ring-2 ring-orange-100' : 'border-blue-100'}`}>
                  <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${editingId ? 'text-orange-600' : 'text-gray-700'}`}>{editingId ? <><Edit size={16}/> Editando Produto</> : <><Plus size={16} className="text-blue-600"/> Novo Produto</>}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {/* 1. MANTÉM O NOME */}
<div className="col-span-2 md:col-span-2">
  <input type="text" placeholder="Nome" className="w-full p-2 border border-gray-200 rounded text-sm outline-none" value={novoItem.nome} onChange={e => setNovoItem({...novoItem, nome: e.target.value})} />
</div>

{/* 2. MUDA O "MIN" PARA UM CAMPO MAIS ESTREITO */}
<div className="col-span-1">
  <input type="number" placeholder="Mín" className="w-full p-2 border border-red-100 bg-red-50/20 rounded text-sm outline-none" value={novoItem.qtd_minima} onChange={e => setNovoItem({...novoItem, qtd_minima: e.target.value})} />
</div>

{/* 3. ADICIONA ESTE NOVO SELECT DE UNIDADE AQUI */}
<div className="col-span-1">
  <select 
    className="w-full p-2 border border-gray-200 rounded text-sm outline-none bg-white font-medium"
    value={novoItem.unidade} 
    onChange={e => setNovoItem({...novoItem, unidade: e.target.value})}
  >
    <option value="kg">KG</option>
    <option value="un">UN</option>
    <option value="pct">PCT</option>
    <option value="garrafa">GARRAFA</option>
    <option value="barras">BARRAS</option>
    <option value="balde">BALDE</option>
    <option value="lt">LT</option>
    <option value="g">G</option>
  </select>
</div>


{/* 4. MANTÉM O FORNECEDOR (Mas agora ele ocupa 1 coluna no grid) */}
<div className="col-span-2 md:col-span-1">
  <select className="w-full p-2 border border-gray-200 rounded text-sm outline-none" value={novoItem.local} onChange={e => setNovoItem({...novoItem, local: e.target.value})}>
    {ordemRota.map(l => <option key={l} value={l}>{l}</option>)}
    {!ordemRota.includes(novoItem.local) && <option value={novoItem.local}>{novoItem.local}</option>}
  </select>
</div>
                    <div className="col-span-2 md:col-span-1 flex gap-2">
                      {editingId && <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-100 text-gray-500 rounded"><XCircle size={18} className="mx-auto" /></button>}
                      <button onClick={handleSalvarOuAtualizarItem} className={`flex-1 font-bold rounded text-sm text-white ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>{editingId ? 'Ok' : 'Add'}</button>
                    </div>
                  </div>
                </Card>
                <div className="space-y-3">
                  <div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" placeholder="Buscar produto..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none" value={filtroEstoque} onChange={e => setFiltroEstoque(e.target.value)} /></div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">{insumosFiltrados.map(item => (<div key={item.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50"><div className="col-span-6 md:col-span-5 pr-2"><div className="font-bold text-gray-800 text-sm truncate">{item.nome}</div><Badge color="blue">{item.local}</Badge></div><div className="col-span-4 md:col-span-5 text-xs text-gray-500">Mín: <span className="font-bold text-gray-700">{item.qtd_minima} {item.unidade}</span></div><div className="col-span-2 text-right flex justify-end gap-1"><button onClick={() => handleEditarItem(item)} className="p-2 text-gray-400 hover:text-orange-500"><Edit size={16} /></button><button onClick={() => handleSolicitarExclusao(item.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></div></div>))}</div>
                  </div>
                </div>
              </>
            )}

            {subTabCadastro === 'fornecedores' && (
              <>
                 <Card className={`bg-white border transition-colors ${editingFornecedorId ? 'border-purple-200 ring-2 ring-purple-100' : 'border-purple-100'}`}>
                  <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${editingFornecedorId ? 'text-purple-700' : 'text-gray-700'}`}>{editingFornecedorId ? <><Edit size={16}/> Editando Fornecedor</> : <><Plus size={16} className="text-purple-600"/> Novo Fornecedor</>}</h3>
                  <div className="space-y-3">
                      <div><label className="text-[10px] font-bold text-gray-400 uppercase">Nome da Empresa</label><input type="text" className="w-full p-2 border border-gray-200 rounded text-sm outline-none" value={novoFornecedor.nome} onChange={e => setNovoFornecedor({...novoFornecedor, nome: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Telefone</label><input type="text" className="w-full p-2 border border-gray-200 rounded text-sm outline-none" value={novoFornecedor.telefone} onChange={e => setNovoFornecedor({...novoFornecedor, telefone: e.target.value})} /></div>
                          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Endereço</label><input type="text" className="w-full p-2 border border-gray-200 rounded text-sm outline-none" value={novoFornecedor.endereco} onChange={e => setNovoFornecedor({...novoFornecedor, endereco: e.target.value})} /></div>
                      </div>
                      <div><label className="text-[10px] font-bold text-gray-400 uppercase">Obs</label><input type="text" className="w-full p-2 border border-gray-200 rounded text-sm outline-none" value={novoFornecedor.obs} onChange={e => setNovoFornecedor({...novoFornecedor, obs: e.target.value})} /></div>
                      <div className="flex gap-2 pt-2">
                        {editingFornecedorId && <button onClick={() => { setEditingFornecedorId(null); setNovoFornecedor({ nome: '', telefone: '', endereco: '', obs: '' }); }} className="flex-1 bg-gray-100 text-gray-500 rounded py-2 font-bold text-sm">Cancelar</button>}
                        <button onClick={handleSalvarOuAtualizarFornecedor} className={`flex-1 font-bold rounded py-2 text-sm text-white ${editingFornecedorId ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'}`}>{editingFornecedorId ? 'Salvar' : 'Cadastrar'}</button>
                      </div>
                  </div>
                </Card>
                <div className="space-y-3">
                    {fornecedores.map(forn => (
                        <div key={forn.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative group">
                            <div className="flex justify-between items-start mb-2"><div><h4 className="font-bold text-gray-800 text-lg">{forn.nome}</h4>{forn.endereco && <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {forn.endereco}</div>}</div><div className="flex gap-2"><button onClick={() => handleEditarFornecedor(forn)} className="p-2 bg-gray-50 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"><Edit size={16}/></button><button onClick={() => handleExcluirFornecedor(forn.id)} className="p-2 bg-gray-50 text-red-400 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16}/></button></div></div>
                            <div className="flex flex-wrap gap-2 items-center text-sm">{forn.telefone ? (<a href={`https://wa.me/55${forn.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold hover:bg-emerald-100"><Phone size={14}/> {forn.telefone}</a>) : <span className="text-gray-400 text-xs italic">Sem telefone</span>}{forn.obs && (<span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-100 text-xs"><FileText size={14}/> {forn.obs}</span>)}</div>
                        </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


