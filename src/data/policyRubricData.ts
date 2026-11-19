export interface RubricCategory {
  id: string;
  orderLabel: string;
  name: string;
  summary: string;
}

export interface PolicyRubricItem {
  id: string;
  categoryId: string;
  categoryName: string;
  itemNo: string;
  title: string;
  detail?: string;
  direction: 'reward' | 'punishment' | 'both';
  tier1Label: string; // 表扬 / 批评
  tier2Label: string; // 嘉奖 / 警告
  tier3Label: string; // 记功 / 记过
  hasTerminationRisk?: boolean;
}

export const COMPANY_POLICY_META = {
  companyName: '广东恒翼能科技股份有限公司及分、子公司',
  principles: ['公平透明', '量化导向', '即时反馈', '奖罚对等'],
  pointValueYuan: 100, // 1分折合100元人民币
  committeeReviewDays: 2, // 奖惩委员会2日内复核
  appealWindowDays: 3, // 收到奖惩通知3日内可申诉
  annualBudgetPoolYuan: 200000, // 演示默认公司年度激励预算
  orgResponsibilities: [
    {
      role: '奖惩委员会',
      composition: '总经理、董事长助理、质量中心负责人、品质部负责人、项目管理部负责人、成本工程部负责人、综合管理部负责人、流程与IT部负责人等',
      duty: '负责审批奖惩提案、仲裁申诉案件、管理奖金池（2日内复核裁决）',
    },
    {
      role: '综合管理部',
      composition: '人力与行政综合治理团队',
      duty: '负责积分台账管理、流程监督、制度培训，以及本制度的制订、修改与废止',
    },
    {
      role: '各部门负责人',
      composition: '一级部门及核心业务单元负责人',
      duty: '负责提报奖惩事项、初审奖惩等级，提报时须附相关证据材料与客观说明',
    },
    {
      role: '财务部',
      composition: '独立核算与资金管理专岗',
      duty: '负责奖金池资金独立账户托管（非公司运营账户）及月度工资兑现与季度收支公示',
    },
  ],
  gradePointRules: [
    {
      category: 'reward' as const,
      grade: '表扬',
      pointsRange: '+1 ~ +3 分',
      yuanRange: '+¥100 ~ +¥300',
      note: '适用于日常高效响应、主动补位等正向贡献',
    },
    {
      category: 'reward' as const,
      grade: '嘉奖',
      pointsRange: '+4 ~ +5 分',
      yuanRange: '+¥400 ~ +¥500',
      note: '适用于达成关键节点、降本增效或跨部门协作突破',
    },
    {
      category: 'reward' as const,
      grade: '记功',
      pointsRange: '+6 ~ +20 分（重大贡献经总经理/董事长批准可突破上限）',
      yuanRange: '+¥600 ~ +¥2,000+',
      note: '适用于重大技术突破、避免重大损失或客户书面高度认可',
    },
    {
      category: 'punishment' as const,
      grade: '批评',
      pointsRange: '-1 ~ -3 分',
      yuanRange: '-¥100 ~ -¥300',
      note: '累计 3 次批评自动升级为 1 次警告（升级不再额外核减绩效分）',
    },
    {
      category: 'punishment' as const,
      grade: '警告',
      pointsRange: '-4 ~ -5 分',
      yuanRange: '-¥400 ~ -¥500',
      note: '累计 3 次警告自动升级为 1 次记过（升级不再额外核减绩效分）',
    },
    {
      category: 'punishment' as const,
      grade: '记过',
      pointsRange: '-6 ~ -20 分（信息安全核心红线最高 -50 分）',
      yuanRange: '-¥600 ~ -¥2,000+',
      note: '累计 3 次记过予以解除劳动合同',
    },
    {
      category: 'punishment' as const,
      grade: '解除劳动合同',
      pointsRange: '触犯 15 条红线或累计 3 次记过',
      yuanRange: '不作任何经济补偿或赔偿',
      note: '严重违反公司规章制度或劳动纪律情形',
    },
  ],
};

export const POLICY_RUBRIC_CATEGORIES: RubricCategory[] = [
  { id: 'rd', orderLabel: '一', name: '产品研发', summary: '技术路线、2D/3D精度、BOM降本、设计变更与ECN管控（14项）' },
  { id: 'ecn', orderLabel: '二', name: '变更管理', summary: 'DFMEA风险预判、ECN/ECA执行闭环、批次切换与BOM档案（17项）' },
  { id: 'pm', orderLabel: '三', name: '项目管理', summary: '计划达成率、成本偏差、复发率、客户投诉与呆滞物料控制（10大类）' },
  { id: 'qa', orderLabel: '四', name: '质量管控', summary: '数据真实性、来料/首件检验、SOP合规、质量异常闭环与防护（32项）' },
  { id: 'rec', orderLabel: '五', name: '复发管理', summary: '根因分析、防错装置、案例分享、停产责任与横展闭环（8项）' },
  { id: 'col', orderLabel: '六', name: '团队协作与知识传承', summary: '跨部门会议参与、响应时效、复盘深度、案例库与跨基地同步（10项）' },
  { id: 'sec', orderLabel: '七', name: '信息安全管理', summary: '资产拆解、网络违规、信息泄密分级与网络攻击零容忍（19项）' },
  { id: 'saf', orderLabel: '八', name: '安全管理', summary: '三级安全教育、特种作业、消防通道、园区交通与涉密准入（37项）' },
  { id: 'bas', orderLabel: '九', name: '基本遵守', summary: '考勤纪律、6S与资源节约、公共秩序、廉洁与商业贿赂红线（34项）' },
];

export const POLICY_RUBRIC_ITEMS: PolicyRubricItem[] = [
  // 一、产品研发
  { id: 'rd-1', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-01', title: '技术路线分析准确/错误，造成项目损失或节省金额≥5万', direction: 'both', tier1Label: '±2', tier2Label: '—', tier3Label: '—' },
  { id: 'rd-2', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-02', title: '未准确解读客户技术要求，造成项目损失金额≥5万', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '—' },
  { id: 'rd-3', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-03', title: '设计文档版本管理混乱（并行版本≥2个）', direction: 'punishment', tier1Label: '-2', tier2Label: '—', tier3Label: '—' },
  { id: 'rd-4', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-04', title: '样机测试报告延迟提交（>计划节点5天）', direction: 'punishment', tier1Label: '-1', tier2Label: '—', tier3Label: '—' },
  { id: 'rd-5', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-05', title: '2D/3D模型误差控制（≤±1.5%）', direction: 'both', tier1Label: '±3', tier2Label: '—', tier3Label: '—' },
  { id: 'rd-6', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-06', title: '降本方案通过验证（BOM成本降幅≥10%）', direction: 'reward', tier1Label: '—', tier2Label: '+5', tier3Label: '—' },
  { id: 'rd-7', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-07', title: '模块化设计复用率提升（≥30%）', direction: 'reward', tier1Label: '—', tier2Label: '+5', tier3Label: '—' },
  { id: 'rd-8', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-08', title: '研发物料浪费率控制（≤预算5%）', direction: 'both', tier1Label: '±2', tier2Label: '—', tier3Label: '—' },
  { id: 'rd-9', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-09', title: '量产后设备设计变更频次（依据设备ECN清单）', direction: 'both', tier1Label: '±1～5', tier2Label: '—', tier3Label: '—' },
  { id: 'rd-10', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-10', title: '产品设计准确率（依据设备ECN和问题清单）', direction: 'both', tier1Label: '±1～10', tier2Label: '—', tier3Label: '—' },
  { id: 'rd-11', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-11', title: '产品设计完成及时率（依据项目计划时间）', direction: 'both', tier1Label: '±1～10', tier2Label: '—', tier3Label: '—' },
  { id: 'rd-12', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-12', title: '图纸与BOM错漏反问题＜1%（以项目设备问题清单为依据）', direction: 'both', tier1Label: '—', tier2Label: '±2', tier3Label: '—' },
  { id: 'rd-13', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-13', title: '接收反馈后修改资料时效性＞2天（以钉钉信息为依据）', direction: 'both', tier1Label: '—', tier2Label: '±2', tier3Label: '—' },
  { id: 'rd-14', categoryId: 'rd', categoryName: '产品研发', itemNo: '研发-14', title: '设计端问题点确认时间＜1小时（以钉钉信息为依据）', direction: 'both', tier1Label: '—', tier2Label: '±2', tier3Label: '—' },

  // 二、变更管理
  { id: 'ecn-1', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-01', title: '变更导致物料节约或报废、生产工时增减等，依据实际金额判断', direction: 'both', tier1Label: '—', tier2Label: '±5 ~ ±20', tier3Label: '±5 ~ ±20' },
  { id: 'ecn-2', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-02', title: '未产生物料或生产影响仅导致资料变更，按项目或月度统计变更次数', direction: 'both', tier1Label: '±2 ~ ±5', tier2Label: '±2 ~ ±5', tier3Label: '—' },
  { id: 'ecn-3', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-03', title: '通过DFMEA预判变更风险避免损失（>5万元）', direction: 'both', tier1Label: '—', tier2Label: '±5', tier3Label: '—' },
  { id: 'ecn-4', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-04', title: '变更申请单缺失影响分析完成性（成本/交期/质量/安全等）', direction: 'both', tier1Label: '±3', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-5', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-05', title: '变更申请、审批与执行是否按规定执行', direction: 'both', tier1Label: '±2', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-6', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-06', title: '紧急变更补签手续时效性（≤24小时）', direction: 'both', tier1Label: '±1', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-7', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-07', title: '设计变更版本管理混乱（并行使用多个版本）', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '—' },
  { id: 'ecn-8', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-08', title: '变更后员工培训完成率（100%覆盖）', direction: 'both', tier1Label: '±1', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-9', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-09', title: '遵循变更前后有效批次管理不混淆', direction: 'both', tier1Label: '—', tier2Label: '±5', tier3Label: '—' },
  { id: 'ecn-10', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-10', title: '变更物料切换库存呆滞量控制（≤计划10%）', direction: 'both', tier1Label: '—', tier2Label: '±5', tier3Label: '—' },
  { id: 'ecn-11', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-11', title: '变更首件验证报告完整性和及时性', direction: 'both', tier1Label: '±2', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-12', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-12', title: '变更实施（ECN）阶段完全有效执行变更措施和要求', direction: 'both', tier1Label: '—', tier2Label: '±5', tier3Label: '—' },
  { id: 'ecn-13', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-13', title: '变更实施确认（ECA）阶段及时确认实施效果并保留实施证据', direction: 'both', tier1Label: '±2', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-14', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-14', title: 'BOM物料参数正确与否', direction: 'both', tier1Label: '±3', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-15', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-15', title: '变更执行偏离度监测（偏差≥3次/月）', direction: 'punishment', tier1Label: '-3', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-16', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-16', title: '编码档案修改次数占比（按部门算）＞5%/月 或 ≤5%/月', direction: 'both', tier1Label: '±3', tier2Label: '—', tier3Label: '—' },
  { id: 'ecn-17', categoryId: 'ecn', categoryName: '变更管理', itemNo: '变更-17', title: '编码删除失效作废个数占比（按部门算）＞1%/月 或 =0%/月', direction: 'both', tier1Label: '±3', tier2Label: '—', tier3Label: '—' },

  // 三、项目管理
  { id: 'pm-1', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-01', title: '项目计划节点达成率（按期 +1 / 提前1-2天 +3 / 提前3-5天 +4；延迟2-3天 -2 / 3-5天 -5）', direction: 'both', tier1Label: '+1~+3 / -2', tier2Label: '+4 / -5', tier3Label: '—' },
  { id: 'pm-2', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-02', title: '成本偏差率控制（实际/预算＜95% +6；＜98% +5；≤100% +3；＞100% -2；＞102% -5；＞105% -6）', direction: 'both', tier1Label: '+3 / -2', tier2Label: '+5 / -5', tier3Label: '+6 / -6' },
  { id: 'pm-3', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-03', title: '问题复发率（0次 +1 / 1次 -1 / 2次 -3 / 3次 -4）', direction: 'both', tier1Label: '+1 / -1~-3', tier2Label: '-4', tier3Label: '—' },
  { id: 'pm-4', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-04', title: '客户或下游环节重大投诉次数（0次 +2 / 1次 -2 / 2次 -4 / 3次 -6）', direction: 'both', tier1Label: '+2 / -2', tier2Label: '-4', tier3Label: '-6' },
  { id: 'pm-5', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-05', title: '关键路径风险预警及时性（提前7天+ +3 / 提前5-7天 +2 / 提前3-5天 +1）', direction: 'reward', tier1Label: '+1 ~ +3', tier2Label: '—', tier3Label: '—' },
  { id: 'pm-6', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-06', title: '跨部门资源协调成功率（≥95%）', direction: 'reward', tier1Label: '+1', tier2Label: '—', tier3Label: '—' },
  { id: 'pm-7', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-07', title: '项目文件归档完整性（缺失1-2项 -1 / 3-5项 -2 / 5-7项 -3）', direction: 'punishment', tier1Label: '-1 ~ -3', tier2Label: '—', tier3Label: '—' },
  { id: 'pm-8', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-08', title: '供应链交期延误备选方案与执行（有且执行 +1 / 未执行 -1 / 无备选 -2）', direction: 'both', tier1Label: '+1 / -1~-2', tier2Label: '—', tier3Label: '—' },
  { id: 'pm-9', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-09', title: '呆滞物料占比控制（＜0.1% +3 / 0.1%-0.2% -1 / 0.2%-0.3% -2）', direction: 'both', tier1Label: '+3 / -1~-2', tier2Label: '—', tier3Label: '—' },
  { id: 'pm-10', categoryId: 'pm', categoryName: '项目管理', itemNo: '项目-10', title: '项目信息透明度（干系人访问权限完备率 100% +1 / <100% -1 / ≤98% -2）', direction: 'both', tier1Label: '+1 / -1~-2', tier2Label: '—', tier3Label: '—' },

  // 四、质量管控
  { id: 'qa-1', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-01', title: '管辖数据记录完整性和真实性', direction: 'both', tier1Label: '+1', tier2Label: '-5', tier3Label: '—' },
  { id: 'qa-3', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-03', title: '来料检验漏检率控制（≤0.5%）', direction: 'both', tier1Label: '±3', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-4', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-04', title: '首件检验执行完备性（含尺寸/电气/功能）', direction: 'both', tier1Label: '±1', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-5', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-05', title: '隐瞒内部质量事故 / 质量数据造假', direction: 'punishment', tier1Label: '—', tier2Label: '-5 ~ -20', tier3Label: '-5 ~ -20', hasTerminationRisk: true },
  { id: 'qa-6', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-06', title: '检验规范未覆盖客户特殊要求', direction: 'punishment', tier1Label: '-3', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-8', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-08', title: '制程合格率＞98% 或 低于90%（按照项目计算）', direction: 'both', tier1Label: '±3～6', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-9', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-09', title: '质量成本下降，每1万元记1分，上限30分', direction: 'reward', tier1Label: '+1～+30', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-10', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-10', title: '标准文件及要求执行/监督不到位造成返工', direction: 'both', tier1Label: '±1～6', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-11', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-11', title: '主动核实与预警潜在问题（数据偏差、流程冲突、设计缺陷）并协调解决避免可量化损失', direction: 'reward', tier1Label: '+3～10', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-13', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-13', title: '未按图纸或SOP执行检验造成批量漏失 / 冒充他人签名或补假质量记录', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '—' },
  { id: 'qa-16', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-16', title: '不同维度质量排名前三后三奖惩', direction: 'both', tier1Label: '—', tier2Label: '—', tier3Label: '±5～10' },
  { id: 'qa-17', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-17', title: '质量异常未及时响应、他人反馈不重视处理、或闭环追查横展不力', direction: 'punishment', tier1Label: '-1 ~ -3', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-25', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-25', title: '无返工工单/标准确认的批量返工、大电流线螺丝松动、批量镜向模块混装装反', direction: 'punishment', tier1Label: '-3', tier2Label: '—', tier3Label: '—' },
  { id: 'qa-29', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-29', title: '产品防护不当被爆晒/淋雨/搬运损坏，或未经品质同意撕掉不良标识', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '—' },
  { id: 'qa-31', categoryId: 'qa', categoryName: '质量管控', itemNo: '质量-31', title: '质量争议过程中辱骂或过激行为，或资产保管不当丢失/损坏', direction: 'punishment', tier1Label: '—', tier2Label: '—', tier3Label: '-10' },

  // 五、复发管理
  { id: 'rec-1', categoryId: 'rec', categoryName: '复发管理', itemNo: '复发-01', title: '重复性故障根本原因分析报告延迟', direction: 'punishment', tier1Label: '-1', tier2Label: '—', tier3Label: '—' },
  { id: 'rec-2', categoryId: 'rec', categoryName: '复发管理', itemNo: '复发-02', title: '防错装置开发应用（杜绝同类问题）', direction: 'reward', tier1Label: '—', tier2Label: '+5', tier3Label: '—' },
  { id: 'rec-3', categoryId: 'rec', categoryName: '复发管理', itemNo: '复发-03', title: '主动分享或隐瞒失效案例', direction: 'both', tier1Label: '±1', tier2Label: '—', tier3Label: '—' },
  { id: 'rec-4', categoryId: 'rec', categoryName: '复发管理', itemNo: '复发-04', title: '因措施无效导致产线停产（≥4小时）', direction: 'punishment', tier1Label: '-3 ~ -5', tier2Label: '-3 ~ -5', tier3Label: '—' },
  { id: 'rec-5', categoryId: 'rec', categoryName: '复发管理', itemNo: '复发-05', title: '预防措施覆盖同类产品比率（≥90%）', direction: 'reward', tier1Label: '+3', tier2Label: '—', tier3Label: '—' },
  { id: 'rec-6', categoryId: 'rec', categoryName: '复发管理', itemNo: '复发-06', title: '设计FMEA未更新导致问题复发', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '—' },
  { id: 'rec-7', categoryId: 'rec', categoryName: '复发管理', itemNo: '复发-07', title: '问题点措施未横展导致老问题重复发生', direction: 'punishment', tier1Label: '-1～5', tier2Label: '—', tier3Label: '—' },
  { id: 'rec-8', categoryId: 'rec', categoryName: '复发管理', itemNo: '复发-08', title: '采取措施杜绝错误和问题发生，避免损失', direction: 'reward', tier1Label: '+1～5', tier2Label: '—', tier3Label: '—' },

  // 六、团队协作与知识传承
  { id: 'col-1', categoryId: 'col', categoryName: '团队协作与知识传承', itemNo: '协作-01', title: '跨部门变更沟通会/复发分析会参与度（无故迟到 -0.5 / 缺席 -1 / 月度全勤 +2）', direction: 'both', tier1Label: '+2 / -0.5~-1', tier2Label: '—', tier3Label: '—' },
  { id: 'col-2', categoryId: 'col', categoryName: '团队协作与知识传承', itemNo: '协作-02', title: '响应及时性（消除已读不回）：即时通<0.5h +1 / 0.5-2h -1 / 2-4h -2；邮件<24h +1 / 24-48h -2 / 48-72h -3', direction: 'both', tier1Label: '+1 / -1~-3', tier2Label: '—', tier3Label: '—' },
  { id: 'col-3', categoryId: 'col', categoryName: '团队协作与知识传承', itemNo: '协作-03', title: '项目复盘报告深度（超3条有效措施 +2 / 1-3条 +1 / 应对式提交 -1）', direction: 'both', tier1Label: '+1~+2 / -1', tier2Label: '—', tier3Label: '—' },
  { id: 'col-4', categoryId: 'col', categoryName: '团队协作与知识传承', itemNo: '协作-04', title: '标准化案例库建设完整性（覆盖≥95%场景）', direction: 'reward', tier1Label: '+2', tier2Label: '+5', tier3Label: '—' },
  { id: 'col-5', categoryId: 'col', categoryName: '团队协作与知识传承', itemNo: '协作-05', title: '跨厂区/基地技术同步（准时 +1 / 延迟1-3天 -1 / 3-5天 -2 / 5-7天 -3 / >7天 -2）', direction: 'both', tier1Label: '+1 / -1~-3', tier2Label: '—', tier3Label: '—' },
  { id: 'col-6', categoryId: 'col', categoryName: '团队协作与知识传承', itemNo: '协作-06', title: '跨部门团队合作，比计划提前完成项目任务交付', direction: 'reward', tier1Label: '+2～10', tier2Label: '—', tier3Label: '—' },
  { id: 'col-7', categoryId: 'col', categoryName: '团队协作与知识传承', itemNo: '协作-07', title: '过往经验知识传承，节省新项目成本', direction: 'reward', tier1Label: '+1～8', tier2Label: '—', tier3Label: '—' },

  // 七、信息安全管理
  { id: 'sec-1', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-01', title: '恶意损坏固定资产、未经IT允许拆解电脑或篡改系统设置/卸载加密卓管杀毒软件', direction: 'punishment', tier1Label: '—', tier2Label: '-2', tier3Label: '—' },
  { id: 'sec-4', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-04', title: '使用代理/VPN访问无关不良网站、随意打印私人文件、违规下载不良软件资料', direction: 'punishment', tier1Label: '-1 ~ -2', tier2Label: '-3 ~ -5', tier3Label: '—' },
  { id: 'sec-7', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-07', title: '举报违反IT管理制度事件，或提出改善建议/发现系统漏洞切实提升安全性', direction: 'reward', tier1Label: '—', tier2Label: '+5', tier3Label: '—' },
  { id: 'sec-9', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-09', title: '私自拆卸遮挡摄像头、私自错开撞击门禁、私接非授权网络设备、关闭网络监控电源', direction: 'punishment', tier1Label: '-2', tier2Label: '-5 ~ -10', tier3Label: '-20' },
  { id: 'sec-13', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-13', title: '破坏公司光缆（断网4小时以内警告并赔维修费；断网4小时以上记过）', direction: 'punishment', tier1Label: '—', tier2Label: '-10', tier3Label: '-20' },
  { id: 'sec-14', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-14', title: '企业邮箱发送广告/垃圾或违法违规邮件（未影响警告 / 发垃圾记过 / 严重损害解除合同）', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '-20', hasTerminationRisk: true },
  { id: 'sec-15', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-15', title: '未授权拍摄公司机密或客户资料（立即删除警告 / 小范围传播记过 / 售卖传播解除合同）', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '-20', hasTerminationRisk: true },
  { id: 'sec-16', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-16', title: '未授权向无关同事、厂商及客户揭露公司内部或核心机密信息', direction: 'punishment', tier1Label: '—', tier2Label: '-10', tier3Label: '-20', hasTerminationRisk: true },
  { id: 'sec-17', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-17', title: '编制/运行黑客病毒程序，或攻击公司网络、服务器、信息系统', direction: 'punishment', tier1Label: '—', tier2Label: '-10', tier3Label: '-20', hasTerminationRisk: true },
  { id: 'sec-19', categoryId: 'sec', categoryName: '信息安全管理', itemNo: '信安-19', title: '窃取、盗卖公司信息资产（未损批评 / 较重要警告 / 核心资产解除合同并追责）', direction: 'punishment', tier1Label: '-10', tier2Label: '-20', tier3Label: '-50', hasTerminationRisk: true },

  // 八、安全管理
  { id: 'saf-1', categoryId: 'saf', categoryName: '安全管理', itemNo: '安全-01', title: '未参加“三级”等安全培训、未佩戴劳保用品、不按SOP作业致工伤、无隔离警戒线、防爆柜未双人双锁', direction: 'punishment', tier1Label: '-2 ~ -3', tier2Label: '—', tier3Label: '—' },
  { id: 'saf-6', categoryId: 'saf', categoryName: '安全管理', itemNo: '安全-06', title: '违章指挥、强令员工冒险作业（未酿事故警告 -5 / 酿成事故记过 -20）', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '-20' },
  { id: 'saf-10', categoryId: 'saf', categoryName: '安全管理', itemNo: '安全-10', title: '携带违禁品/动力电池进电梯办公区、堵塞消防通道、破坏安全设施、设备损坏未第一时间上报', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '—' },
  { id: 'saf-15', categoryId: 'saf', categoryName: '安全管理', itemNo: '安全-15', title: '隐瞒/虚报事故、破坏事故现场、玩忽职守或擅自拆除安全防护装置酿成事故', direction: 'punishment', tier1Label: '—', tier2Label: '—', tier3Label: '-10' },
  { id: 'saf-18', categoryId: 'saf', categoryName: '安全管理', itemNo: '安全-18', title: '积极参加安全培训比赛获佳绩(+2)、检举违章/发现重大隐患/采纳安全合理化建议(+5)', direction: 'reward', tier1Label: '+2 ~ +3', tier2Label: '+5', tier3Label: '—' },
  { id: 'saf-23', categoryId: 'saf', categoryName: '安全管理', itemNo: '安全-23', title: '火灾/紧急安全事故中判断正确及时救险(+10)，危及生命财产时扑救/心肺复苏避免重大伤亡(+20)', direction: 'reward', tier1Label: '—', tier2Label: '—', tier3Label: '+10 ~ +20' },
  { id: 'saf-26', categoryId: 'saf', categoryName: '安全管理', itemNo: '安全-26', title: '翻越栅栏隔离带、私拉电源为电车充电、非预约协助外人进园区/涉密区域(-20)、未按规定吸烟起火(-10)、高空抛物(-10)', direction: 'punishment', tier1Label: '-2', tier2Label: '-5', tier3Label: '-10 ~ -20' },

  // 九、基本遵守
  { id: 'bas-1', categoryId: 'bas', categoryName: '基本遵守', itemNo: '基本-01', title: '月度签卡>5次或迟到早退旷工>3次(-1)、排队等打卡(-2)、未穿工服工牌(-2)、浪费水电纸张/空调<26℃边开窗(-2)', direction: 'punishment', tier1Label: '-1 ~ -2', tier2Label: '—', tier3Label: '—' },
  { id: 'bas-6', categoryId: 'bas', categoryName: '基本遵守', itemNo: '基本-06', title: '上班玩游戏/刷视频/打私人电话/外出办私事(-2)；打卡后未到岗或中途离岗处理私事≥2小时(-20)', direction: 'punishment', tier1Label: '-2', tier2Label: '—', tier3Label: '-20' },
  { id: 'bas-8', categoryId: 'bas', categoryName: '基本遵守', itemNo: '基本-08', title: '反馈一般/重要违纪行为被查实(+2/+5)，防止公司重大损失(+20)，商业贿赂有效投诉(+5)', direction: 'reward', tier1Label: '+2', tier2Label: '+5', tier3Label: '+20' },
  { id: 'bas-12', categoryId: 'bas', categoryName: '基本遵守', itemNo: '基本-12', title: '酒后上班(-5)、私带物料回宿舍(-5)、网络平台丑化公司高层(-5)、破坏公共设施/挪用绿植(-5)', direction: 'punishment', tier1Label: '—', tier2Label: '-5', tier3Label: '—' },
  { id: 'bas-32', categoryId: 'bas', categoryName: '基本遵守', itemNo: '基本-32', title: '商业贿赂行为查实，经济价值≤2000元', direction: 'punishment', tier1Label: '—', tier2Label: '—', tier3Label: '-20', hasTerminationRisk: true },
];

export const TERMINATION_REDLINES: { no: number; content: string }[] = [
  { no: 1, content: '提供虚假个人信息、履历、证件入职者；' },
  { no: 2, content: '在试用期内被认定试用不合格者；' },
  { no: 3, content: '连续旷工3天或一个月内累计旷工7天或一年内累计旷工15天的；' },
  { no: 4, content: '工作不认真（违反操作/安全规程等）或疏忽大意致产品报废、物料浪费、设备损坏或客户投诉，造成经济损失＞人民币3,000元的；' },
  { no: 5, content: '利用职务便利侵占公司资产、挪用公款、虚报费用等的；' },
  { no: 6, content: '收受供应商或合作单位提供的经济利益或有偿服务的；' },
  { no: 7, content: '消极怠工情节严重、罢工或煽动他人罢工的；' },
  { no: 8, content: '发生打架斗殴、盗窃、吸毒及参与赌博等违法行为的；' },
  { no: 9, content: '泄露公司机密的（含商业秘密、技术研发秘密等）；' },
  { no: 10, content: '各类数据或报表弄虚作假、瞒报的；' },
  { no: 11, content: '扰乱公司正常生产经营秩序的；' },
  { no: 12, content: '行为违法受到相关部门拘留处分（含行政拘留、刑事拘留、司法拘留）的；' },
  { no: 13, content: '符合其它法律法规情形的（包括但不限于被依法追究刑事责任等）；' },
  { no: 14, content: '累计三次记过的；' },
  { no: 15, content: '其它未在此列明，但确有对公司造成损失、破坏或不良影响者，公司可根据实际情况做出相应惩处。' },
];
