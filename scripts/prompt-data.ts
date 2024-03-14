export const promptData: ReadonlyArray<{ title: string; authors: string; abstract: string }> = [
  {
    title: 'Momentum Control for Crane Load Stabilization',
    authors: 'Daniel A. Haarhoff',
    abstract:
      "The digitalization of the construction industries planning and execution phases, coupled with advances in automation technology has led to a renaissance for construction robotics. Current efforts to provide robots for the execution of digital construction plans revolve around either the adaptation of industrial robots for the construction site, highly specialized custom robots or the digitalization of existing construction equipment. However, there is currently no robotics approach that addresses the very large work envelope that constitutes a construction site.\n\nThis work therefore evaluates the feasibility of operating robots and other kinematic systems hanging from a regular crane. A crane's hook is not a stable base for a robot. Movements of the robot as well as external forces would lead to motions and oscillations. The robot would therefore not be able to execute accurate movements.\n\nStabilizing a platform at the hook to create a useable base for robots requires adding further means of control to said platform. Three approaches are known: additional ropes, propulsive devices and momentum control devices. This work studies the use of a specific type of momentum control device, so called control moment gyroscopes. These are an established technology for the stabilization of ships and also the reorientation of spacecraft. By gimbaling a fast spinning rotor orthogonal to its axis of rotation, CMGs are able to generate torque through the principle of gyroscopic reaction. They are thereby able to generate torque in mid-air and unlike additional ropes or propulsive devices do not interfere with their environment.\n\nThe following work develops equations of motion and a model for the crane-CMG-robot system. A general control strategy is laid out and a simple PD-based controller is designed. The model is validated through a variety of simulations and used to understand the critical interactions between the three systems. The ability of a CMG platform to predictively compensate the torques produced by a robot and thereby improve its path accuracy is shown through simulation. It is also shown how such a platform can help dampen hook and load oscillations. The simulations not only show the potential of the approach, but also allow the work to develop sizing guidelines and identify critical areas for future research. The work therefore closes by laying out the critical path to bringing this approach to the construction site.",
  },
  {
    title: 'Performance Analysis and Shared Memory Parallelisation of FDS',
    authors: 'Daniel Haarhoff, Lukas Arnold',
    abstract:
      'Fire simulation is a complex issue due to the large number of physical and chemical processes involved. The code of FDS covers many of these using various models and is extensively verified and validated, but lacks support for modern multicore hardware. This article documents the efforts of providing an Open Multi-Processing (OpenMP) parallelised version of the Fire Dynamics Simulator (FDS), version 6, that also permits hybrid use with the Message Passing Interface (MPI). As FDS does not allow for arbitrary domain decomposition to be used with MPI, the amount of computational resources is limited. An OpenMP parallelisation does not have these restrictions , but it is not able to use the resources as efficient as MPI does. Prior to parallelising the code, FDS was profiled using various measurement systems. To allow paral-lelisation the radiation solver as well as the tophat filter for LES equation where altered. The achieved par-allelisation and speedup for various architectures and problem sizes were measured. A speedup of two is now attainable for common simulation cases on modern four-core processors and requires no additional setup by the user. Timings for various combinations of simultaneous usage of OpenMP and MPI are presented. Finally recommendations for further optimisation efforts are given.',
  },
  {
    title: 'Viability of Mobile Forms for Population Health Surveys in Low Resource Areas',
    authors: 'Alexander Davis, Aidan Chen, Milton Chen, and James Davis',
    abstract:
      'Population health surveys are an important tool to effectively allocate limited resources in low resource communities. In such an environment, surveys are often done by local population with pen and paper. Data thus collected is difficult to tabulate and analyze. We conducted a series of interviews and experiments in the Philippines to assess if mobile forms can be a viable and more efficient survey method. We first conducted pilot interviews and found 60% of the local surveyors actually preferred mobile forms over paper. We then built a software that can generate mobile forms that are easy to use, capable of working offline, and able to track key metrics such as time to complete questions. Our mobile form was field tested in three locations in the Philippines with 33 surveyors collecting health survey responses from 266 subjects. The percentage of surveyors preferring mobile forms increased to 76% after just using the form a few times. The results demonstrate our mobile form is a viable method to conduct large scale population health surveys in a low resource environment. ',
  },
  {
    title:
      'A Hybrid Pipeline for Covid-19 Screening Incorporating Lungs Segmentation and Wavelet Based Preprocessing of Chest X-Rays',
    authors:
      'Haikal Abdulah, Benjamin Huber, Hassan Abdallah, Luigi L. Palese, Hamid Soltanian-Zadeh, and Domenico L. Gatti',
    abstract:
      'We have developed a two-module pipeline for the detection of SARS-CoV-2 from chest X-rays (CXRs). Module 1 is a traditional convnet that generates masks of the lungs overlapping the heart and large vasa. Module 2 is a hybrid convnet that preprocesses CXRs and corresponding lung masks by means of the Wavelet Scattering Transform, and passes the resulting feature maps through an Attention block and a cascade of Separable Atrous Multiscale Convolutional Residual blocks to produce a class assignment as Covid or non-Covid. Module 1 was trained on a public dataset of 6395 CXRs with radiologist annotated lung contours. Module 2 was trained on a dataset of 2362 non-Covid and 1435 Covid CXRs acquired at the Henry Ford Health System Hospital in Detroit. Six distinct cross-validation models, were combined into an ensemble model that was used to classify the CXR images of the test set. An intuitive graphic interphase allows for rapid Covid vs. non-Covid classification of CXRs, and generates high resolution heat maps that identify the affected lung regions.',
  },
  {
    title: 'Integrando Ensino E Pesquisa Na Formação Docente: Uma Proposta In Loc',
    authors:
      'Vanessa Candito, Karla Mendonça Menezes, Carolina Braz Carlan Rodrigues, and Félix Alexandre Antunes Soares',
    abstract:
      '<jats:p>Grandes são os desafios enfrentados pelos professores no cenário atual, quem impactam de maneira significativa a prática pedagógica. E assim, surge, a necessidade de encontrar alternativas para qualificar o ensino que estejam alinhadas com a realidade social contemporânea.  A promoção da pesquisa na escola desempenha um papel crucial no desenvolvimento do conhecimento, na promoção da aprendizagem e no aprimoramento das habilidades críticas dos estudantes, que traz benefícios significativos para educandos, educadores e o sistema educacional como um todo. Esse estudo analisou as percepções e a integração da pesquisa escolar na prática pedagógica de professores de uma escola pública estadual, sobre um processo formativo, amparado no aporte metodológico da pesquisa-ação. Os envolvidos destacam a pesquisa como fundamental para a reconstrução de conhecimento, integrada à prática docente, e o potencial no desenvolvimento da prática educativa, permitindo a identificação de demandas e o desenvolvimento de planos de ação. Promoveu o aprimoramento docente, capacitando-os para práticas de ensino alinhadas às necessidades do contexto escolar e incentivando a reflexão crítica sobre suas abordagens pedagógicas.</jats:p>',
  },
  {
    title: 'DOS ESTIGMAS HISTÓRICOS À AUTODECLARAÇÃO DA DEFICIÊNCIA: UM ESTUDO COM UNIVERSITÁRIOS',
    authors: 'Lúcia Pereira Leite, Leonardo Santos Amâncio Cabral, and Ana Paula Camilo Ciantelli',
    abstract:
      '<jats:p>As múltiplas compreensões circulantes sobre a deficiência têm incitado, na perspectiva histórico-cultural, revisões críticas inclusive no âmbito da Educação Superior. Frente a esse desafio, a pesquisa em tela visou identificar e analisar, no contexto de duas instituições públicas brasileiras da Educação Superior, as concepções de deficiência especificamente de 81 universitários (graduação e pós-graduação) que se autodeclararam com essa condição. Por meio da aplicação de um questionário online de caracterização, somado à Escala Intercultural de Concepções de Deficiência (EICD), a análise estatística dos dados coletados revelou a tendente concordância dos participantes às concepções biológica e social da deficiência, ainda que a concepção metafísica tenha sido identificada. Portanto, o estudo desvela um complexo e necessário debate sobre o fenômeno socioantropológico da deficiência, com potencial interface de todas as áreas do conhecimento, com o escopo de fomentar o reconhecimento e a legitimação dos direitos cidadãos dos sujeitos com deficiências. Tensiona-se, ainda, sobre a autodeclaração para definição da condição de deficiência.</jats:p>',
  },
]
