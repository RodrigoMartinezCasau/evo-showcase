/**
 * Política de privacidad (ES) — misma versión que App Store Connect / URL pública.
 * Última actualización: 8 de junio de 2026.
 */
export const PRIVACY_POLICY_FULL_ES = `
POLÍTICA DE PRIVACIDAD
Aplicación Evo · com.evoconn.evo
Desarrollada y operada por EvoConn
Última actualización: 8 de junio de 2026

1. Introducción
Bienvenido/a a Evo, una aplicación móvil de carácter social y filosófico que permite compartir reflexiones, explorar frases, seguir a otros usuarios, participar en debates guiados por inteligencia artificial, descubrir un perfil filosófico personalizado y compartir contenidos con su comunidad.
EvoConn («nosotros», «el responsable») es el responsable del tratamiento de sus datos personales en los términos descritos en esta Política de Privacidad. EvoConn es la marca bajo la que opera actualmente Rodrigo Martínez como persona física, mientras se completa el proceso de constitución de la sociedad correspondiente.
Esta política se redacta conforme al Reglamento (UE) 2016/679 General de Protección de Datos (RGPD), la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD) y la legislación complementaria aplicable en España. Le rogamos que la lea detenidamente antes de utilizar la aplicación.

2. Datos personales que recogemos
2.1 Datos de cuenta y perfil
Cuando crea una cuenta en Evo, recogemos y almacenamos en nuestra infraestructura de backend (Supabase) los siguientes datos:
Identificador único de usuario (UUID) generado por el sistema de autenticación.
Nombre de usuario (@usuario) elegido por usted.
Dirección de correo electrónico, cuando el método de registro así lo proporciona.
Número de teléfono, cuando opta por el registro mediante SMS/OTP.
Clan o corriente filosófica asignada con base en sus interacciones y reflexiones.
Estado de clasificación filosófica (classification_state): información estructurada sobre el cálculo del clan.
Rango dentro de la aplicación.
Frase o lema de insignia personal.
Contadores de actividad: número de reflexiones publicadas, frases utilizadas y otros indicadores de uso.
Racha de uso (días consecutivos de actividad).
Usos restantes disponibles en el período actual.
Frases o contenidos desbloqueados.
Indicador de cuenta privada (is_private): si configura su cuenta como privada, sus publicaciones y perfil solo serán accesibles para seguidores aprobados.
URL del avatar de perfil, almacenado en Supabase Storage (bucket avatars).
Token de notificaciones push (push_token), si activa las notificaciones.
Fecha de creación de la cuenta.

2.2 Datos de autenticación
La aplicación utiliza Supabase Auth como sistema de autenticación. Según el método de inicio de sesión que elija:
Apple Sign In (iOS): el flujo nativo de Apple gestiona la autenticación. Podemos recibir un identificador único de Apple y, opcionalmente, una dirección de correo electrónico (Apple puede proporcionar una dirección anonimizada si así lo prefiere).
Google OAuth: autenticación mediante cuenta de Google a través del servicio OAuth integrado en Supabase. Recibimos los datos básicos de perfil que Google comparte en este flujo (habitualmente correo electrónico e identificador de Google).
Facebook OAuth: autenticación mediante cuenta de Facebook/Meta. Recibimos los datos básicos que Facebook comparte en este flujo (habitualmente correo electrónico e identificador de Facebook).
Correo electrónico y contraseña: registro y autenticación directos gestionados por Supabase Auth. Durante la verificación de correo electrónico, las credenciales temporales se almacenan de forma cifrada en el dispositivo mediante SecureStore (almacenamiento seguro cifrado de la plataforma Expo/React Native) hasta que el correo queda confirmado.
Número de teléfono (SMS/OTP): registro y autenticación mediante código de un solo uso enviado por SMS, gestionado por Supabase Auth.
Los tokens de sesión y credenciales de autenticación se almacenan localmente en el dispositivo mediante AsyncStorage (mecanismo de almacenamiento local de React Native/Expo), permitiendo mantener la sesión activa sin necesidad de volver a autenticarse en cada uso.

2.3 Contenido textual generado por el usuario
La aplicación permite crear y compartir los siguientes contenidos:
Reflexiones publicadas.
Frases filosóficas.
Comentarios en publicaciones y respuestas a comentarios.
Textos enviados al asistente de inteligencia artificial en los debates.
El texto que usted redacta o dicta y decide enviar o publicar se almacena en nuestro backend (Supabase) para el funcionamiento del servicio. El contenido que permanezca únicamente en el dispositivo y no se envíe al servidor no es accesible por nosotros.
Los textos de los debates con IA que usted decide enviar se procesan a través de nuestra API propia (FastAPI alojada en Railway), que a su vez utiliza modelos de lenguaje de OpenAI y Anthropic como subencargados del tratamiento (véase apartado 6). Los eventos de uso de IA se registran en la tabla ai_usage_events de Supabase con fines de control de límites y mejora del servicio.

2.4 Imágenes: avatar de perfil e imágenes en publicaciones
La aplicación gestiona dos tipos de imágenes con tratamientos diferenciados:
a) Avatar de perfil: puede seleccionar una imagen de la galería del dispositivo o capturarla con la cámara. En iOS, se declaran los permisos correspondientes (NSPhotoLibraryUsageDescription y NSCameraUsageDescription). La imagen se sube y almacena en Supabase Storage (bucket avatars), quedando referenciada mediante una URL en su perfil.
b) Imágenes en publicaciones: puede adjuntar imágenes a sus publicaciones desde la galería del dispositivo mediante el selector nativo del sistema (expo-image-picker). En Android, no se declaran permisos amplios de acceso a almacenamiento (READ_MEDIA_*); el acceso a imágenes se realiza exclusivamente a través del selector del sistema (photo picker), que limita el acceso a las imágenes que usted seleccione concretamente. En iOS se declara el permiso de acceso a la biblioteca de fotos (NSPhotoLibraryUsageDescription). Las imágenes se comprimen en el dispositivo antes de ser subidas a Supabase Storage (bucket post-images).
c) Moderación automática de imágenes: tanto el avatar como las imágenes que adjunta a publicaciones se someten a un proceso de moderación automática previa a su publicación. Para ello empleamos AWS Rekognition (servicio de Amazon Web Services) mediante una Edge Function en Supabase (moderate-image), que analiza la imagen para detectar contenido inapropiado conforme a categorías estrictas (DetectModerationLabels). Si la imagen se rechaza durante la moderación automática, se elimina inmediatamente del bucket correspondiente y no llega a publicarse ni a asociarse con su perfil. AWS actúa como subencargado del tratamiento (véase apartado 6).
Esta moderación automática constituye una decisión automatizada en el sentido del artículo 22 del RGPD. Puede usted solicitar la revisión humana de cualquier rechazo a través del correo de contacto indicado en el apartado 11.
Puede revocar los permisos de fotos o cámara en cualquier momento desde los ajustes del dispositivo, aunque ello impedirá utilizar las funciones correspondientes desde la aplicación.

2.5 Audio en publicaciones
La aplicación permite asociar pistas de audio a determinadas publicaciones. Es importante señalar que usted no sube audio propio: únicamente puede seleccionar pistas de un catálogo predefinido alojado por nosotros en Supabase Storage (bucket audio-tracks; metadatos en la tabla audio_tracks). Las pistas seleccionadas se reproducen únicamente en el feed «Para ti». No se realiza ningún tratamiento de su voz ni de audio personal en esta funcionalidad.

2.6 Datos de voz y transcripción (micrófono)
Evo permite dictar reflexiones por voz para convertirlas en texto. Para ello, la aplicación solicita permiso de acceso al micrófono del dispositivo (NSMicrophoneUsageDescription en iOS; RECORD_AUDIO en Android).
Aspectos relevantes de este tratamiento:
El reconocimiento de voz se realiza mediante las capacidades nativas del sistema operativo del dispositivo (expo-speech-recognition), configurado en idioma español (es-ES).
El audio captado se procesa localmente en el dispositivo para obtener la transcripción. No enviamos el audio bruto a nuestros servidores.
El texto resultante de la transcripción solo se envía a nuestro backend si usted decide explícitamente publicar o enviar ese contenido.
Puede revocar el permiso de micrófono en cualquier momento desde los ajustes del dispositivo, aunque ello impedirá utilizar el dictado por voz.

Asistente de voz de la aplicación. Evo incluye un asistente de voz opcional que puede responder preguntas y navegar por la aplicación siguiendo sus instrucciones habladas. Su uso requiere su consentimiento explícito, que se le solicita la primera vez que activa el asistente. Cuando usted utiliza el asistente, se envían a proveedores externos de inteligencia artificial (OpenAI, LLC y, en su caso, Anthropic, PBC, como subencargados del tratamiento a través de nuestra API propia) los siguientes datos: la transcripción de lo que usted dice, una descripción del contenido visible en la pantalla en la que se encuentra y datos básicos de su perfil (clan filosófico, porcentajes, estadísticas de uso) necesarios para contextualizar la respuesta. El audio de su voz no sale del dispositivo: la transcripción se realiza localmente mediante las APIs del sistema operativo. Antes del envío, la aplicación aplica un filtrado automático que redacta patrones de datos sensibles (direcciones de correo, teléfonos, tarjetas, IBAN, DNI) presentes en el contexto de pantalla. Puede revocar el consentimiento en cualquier momento desde Ajustes → Voz del asistente; tras revocarlo, el asistente no enviará ningún dato hasta que vuelva a otorgarlo.

2.7 Funciones sociales y datos asociados
La aplicación incluye las siguientes funciones sociales, cuyos datos asociados se almacenan en Supabase:
Feeds «Para ti» y «Siguiendo».
Seguir y dejar de seguir a otros usuarios; cuentas privadas y solicitudes de seguimiento.
Amigos mutuos: intersección entre usuarios a los que sigue y usuarios que le siguen.
Comentarios en publicaciones y respuestas a comentarios.
Votos positivos y negativos (up/down) en publicaciones y comentarios.
Republicación (reposts) de publicaciones de otros usuarios.
Guardar publicaciones en una colección personal.
Visualizaciones de publicaciones (post_views).
Bloqueo de usuarios (tabla blocked_users): permite impedir interacciones con un usuario concreto.
Denuncias de contenido o de usuarios (tabla reports): permite informar a EvoConn sobre infracciones de las normas de uso.

2.8 Mensajería de «shares» (reenvío de publicaciones y perfiles)
La aplicación incluye una funcionalidad de mensajería limitada que permite compartir publicaciones o perfiles con sus amigos mutuos (tablas shared_conversations y shared_items).
Es importante destacar lo siguiente:
No se trata de un sistema de mensajería de texto libre.
No es posible enviar mensajes arbitrarios entre usuarios.
La función se limita exclusivamente al reenvío de publicaciones y perfiles existentes en la aplicación, dirigido únicamente a usuarios con los que mantiene una relación de seguimiento mutuo.

2.9 Clasificación filosófica (asignación de clan)
La asignación de su clan filosófico se realiza mediante un modelo híbrido:
Una primera capa de heurística y aprendizaje automático se ejecuta localmente en su dispositivo.
Cuando hay conexión a internet, una capa adicional basada en modelos de lenguaje (LLM) se ejecuta en nuestro backend (FastAPI / Railway) mediante la llamada POST /classify/reflection, que envía el texto a Anthropic (modelo Claude Haiku) para su análisis. La clave de la API permanece en todo momento en el servidor.
El estado de la clasificación se almacena localmente en el dispositivo (AsyncStorage) y se sincroniza con el campo classification_state de la tabla profiles en Supabase.
Esta asignación de clan constituye una decisión parcialmente automatizada. La asignación no produce, en sí misma, efectos jurídicos sobre usted, pero condiciona su experiencia personalizada dentro de la aplicación. Puede solicitar información adicional o revisión humana de su clan a través del correo de contacto indicado en el apartado 11.

2.10 Perfil filosófico ampliado
Adicionalmente, la aplicación puede generar un perfil filosófico ampliado mediante la API /philosophy-profile/* (FastAPI / Railway). Este perfil incluye resúmenes, filósofos afines, libros recomendados y otros elementos generados con apoyo de modelos de lenguaje (OpenAI y Anthropic). Los datos asociados se almacenan en la tabla philosophical_profile (Railway / Postgres).

2.11 Notificaciones push y locales
La aplicación puede enviarle notificaciones para informarle sobre actividad relacionada con su cuenta:
a) Notificaciones push remotas: generamos y almacenamos un token Expo Push asociado a su perfil en Supabase (campo push_token de la tabla profiles). Las notificaciones push remotas pueden incluir los siguientes tipos:
follow: nuevos seguidores.
follow_request: solicitudes de seguimiento pendientes.
comment: comentarios en sus publicaciones.
comment_reply: respuestas a sus comentarios.
upvote_comment: votos positivos en sus comentarios.
shared_post: publicaciones reenviadas a usted por un amigo mutuo.
shared_profile: perfiles reenviados a usted por un amigo mutuo.
El envío se realiza mediante triggers en Supabase y la infraestructura de Expo Push. No se utilizan con fines publicitarios de terceros.
b) Notificaciones locales de racha: la aplicación puede programar recordatorios locales en su dispositivo para animarle a mantener su racha de uso diario. Estas notificaciones se generan directamente en el dispositivo, sin intervención de servidores externos.
Puede gestionar sus preferencias de notificaciones desde los ajustes del dispositivo o desde la propia aplicación.

2.12 Widgets (iOS y Android)
La aplicación ofrece widgets para la pantalla de inicio que muestran información como la frase del día o el estado de su racha. Estos widgets:
Acceden a datos almacenados localmente en el dispositivo.
En iOS, utilizan App Group UserDefaults.
En Android, utilizan el almacenamiento del widget.
No envían datos a terceros por sí mismos.

2.13 Deep links y dominio asociado
La aplicación responde a enlaces profundos (deep links) en el dominio evoconn.com y www.evoconn.com, específicamente en las rutas /profile y /post. Estos enlaces permiten abrir directamente la aplicación en un perfil o publicación concretos cuando un enlace de este tipo se comparte y se abre desde un dispositivo donde Evo está instalado. No se realiza tratamiento adicional de datos por el mero uso de deep links.

2.14 Datos técnicos y de presencia
La aplicación registra los siguientes datos técnicos para el funcionamiento del servicio:
Presencia de aplicación: pings periódicos registrados mediante RPC analytics_record_presence_ping en la tabla user_app_presence (Supabase).
Usos diarios y datos de racha: API FastAPI en Railway (/uses-log, /streak).
Eventos de uso de IA: registrados en ai_usage_events (Supabase) con fines de control de límites y mejora del servicio.

2.15 Almacenamiento local adicional
Además de los tokens de sesión y credenciales de autenticación mencionados en el apartado 2.2, la aplicación utiliza almacenamiento local en el dispositivo para los siguientes datos:
AsyncStorage: preferencias del usuario (configuración de notificaciones, ahorro de datos, sincronización solo por Wi-Fi), notificaciones in-app, estado de clasificación filosófica y otros datos operativos.
SecureStore: credenciales temporales durante la verificación de correo electrónico (cifrado local).
Estos datos no se transmiten a terceros y permanecen exclusivamente en su dispositivo.

3. Finalidades del tratamiento
Tratamos sus datos para las siguientes finalidades:
Prestación del servicio: creación y gestión de cuenta, autenticación, mantenimiento de su perfil, asignación de clan filosófico, cálculo de rachas y gestión de límites de uso.
Funciones sociales: publicación en los feeds «Para ti» y «Siguiendo», sistema de seguimiento entre usuarios, gestión de cuentas privadas y solicitudes de seguimiento, comentarios, votos, republicación, guardar publicaciones y registro de visualizaciones.
Mensajería de reenvío entre amigos mutuos: permitir el envío de publicaciones y perfiles entre usuarios con relación de seguimiento mutuo.
Bloqueo y denuncias: gestión de las funcionalidades de bloqueo de usuarios y denuncia de contenido o usuarios.
Moderación de contenido: análisis automatizado de imágenes (avatares e imágenes en publicaciones) mediante AWS Rekognition para detectar contenido inapropiado antes de su publicación.
Debates con asistencia de inteligencia artificial: procesar los textos que envía para generar respuestas del asistente y registrar eventos de uso con fines de control de límites.
Clasificación filosófica y perfil filosófico ampliado: asignar un clan filosófico y generar contenido personalizado (resúmenes, filósofos, libros) mediante modelos de lenguaje.
Transcripción de voz: convertir su voz en texto en el dispositivo para facilitar la creación de contenido mediante dictado.
Notificaciones: envío de comunicaciones sobre actividad relevante en su cuenta y recordatorios de racha, sin fines publicitarios de terceros.
Funcionalidad de widgets: mostrar información de la aplicación en la pantalla de inicio del dispositivo.
Deep linking: permitir la apertura de la aplicación a partir de enlaces en el dominio evoconn.com.
Mantenimiento, seguridad y diagnóstico: verificación del correcto funcionamiento del servicio, detección de usos fraudulentos y garantía de la integridad del sistema.
Mejora del producto: análisis de datos de uso agregados o anonimizados para mejorar las funcionalidades de la aplicación.
No tratamos sus datos con finalidades publicitarias propias ni de terceros, ni los vendemos a terceros.

4. Base legal del tratamiento (art. 6 RGPD)
El tratamiento de sus datos se sustenta en las siguientes bases jurídicas:
a) Ejecución de un contrato (art. 6.1.b RGPD): el tratamiento es necesario para la prestación del servicio que usted solicita al crear una cuenta y utilizar la aplicación Evo. Comprende, entre otros, la gestión de cuenta, autenticación, funciones sociales, mensajería de reenvío entre amigos mutuos, debates con IA, asignación de clan, perfil filosófico, racha y límites de uso.
b) Interés legítimo (art. 6.1.f RGPD): el mantenimiento de la seguridad del servicio, la prevención del abuso, la moderación automatizada de imágenes, la gestión de bloqueos y denuncias y la mejora técnica del producto, siempre que no prevalezcan sus derechos y libertades fundamentales. Puede oponerse a este tratamiento en los términos del apartado 10.
c) Consentimiento (art. 6.1.a RGPD): el acceso al micrófono, a la biblioteca de fotos, a la cámara y el envío de notificaciones push, cuyos permisos se solicitan expresamente en el momento en que se requieren. Puede retirar este consentimiento en cualquier momento desde los ajustes del dispositivo, sin que ello afecte a la licitud del tratamiento anterior.
d) Cumplimiento de obligaciones legales (art. 6.1.c RGPD): cuando determinados tratamientos resulten necesarios para cumplir obligaciones que nos imponga la normativa aplicable.
Decisiones automatizadas (art. 22 RGPD):
La aplicación realiza dos tipos de tratamientos parcialmente automatizados que deben mencionarse expresamente:
Asignación del clan filosófico: combinación de heurística local, aprendizaje automático y modelo de lenguaje (Anthropic Claude) ejecutado en nuestro backend. La asignación condiciona la experiencia personalizada en la aplicación pero no produce efectos jurídicos ni significativos en el sentido estricto del art. 22 RGPD.
Moderación automática de imágenes: análisis mediante AWS Rekognition que puede dar lugar al rechazo automático de una imagen y su eliminación inmediata del bucket correspondiente.
En ambos casos, tiene derecho a solicitar intervención humana, expresar su punto de vista e impugnar la decisión a través del correo de contacto indicado en el apartado 11.

5. Plazos de conservación
Conservamos sus datos personales durante el tiempo necesario para cumplir las finalidades descritas:
Datos de cuenta y perfil: mientras su cuenta esté activa. Una vez que solicite la eliminación de la cuenta (véase apartado 10), procederemos a suprimir sus datos en un plazo razonable, salvo obligación legal de conservación.
Datos de autenticación y sesión: los tokens almacenados localmente en el dispositivo (AsyncStorage, SecureStore) se eliminan al cerrar sesión o desinstalar la aplicación.
Contenido publicado (reflexiones, frases, comentarios, respuestas): se conserva mientras esté activo en el servicio o hasta que solicite su eliminación.
Avatar e imágenes en publicaciones: se conservan en los buckets de Supabase Storage mientras estén asociados a un contenido o perfil activo; se eliminan al sustituirlos o al suprimir el contenido o la cuenta. Las imágenes rechazadas durante la moderación automática se eliminan de forma inmediata y no se conservan.
Mensajería de shares (shared_conversations, shared_items): se conserva mientras los elementos compartidos permanezcan activos y no se eliminen.
Denuncias (reports): se conservan durante el tiempo necesario para gestionar la denuncia y, en su caso, mantener un registro razonable de incidencias de moderación.
Visualizaciones de publicaciones (post_views): se conservan según las necesidades operativas de cálculo de métricas y funcionamiento del feed.
Perfil filosófico ampliado (philosophical_profile): se conserva mientras su cuenta esté activa.
Token push: se conserva mientras la cuenta esté activa o hasta que se desactiven las notificaciones.
Eventos de uso de IA (ai_usage_events) y registros de presencia (user_app_presence): se conservan durante el tiempo necesario para el control de límites, prevención de abuso y mejora del servicio. Los datos agregados o anonimizados pueden conservarse por más tiempo.
Si en el futuro activásemos servicios de monitorización de errores (por ejemplo, Sentry), los plazos de conservación correspondientes se especificarían y notificarían en una versión actualizada de esta política.

6. Destinatarios y terceros
Para prestar el servicio utilizamos los siguientes proveedores externos, que pueden actuar como encargados del tratamiento, subencargados o responsables independientes según el caso:
6.1 Supabase
Supabase (Supabase Inc.) proporciona la infraestructura de autenticación (Supabase Auth), base de datos relacional (Postgres), almacenamiento en la nube (Supabase Storage) y funciones serverless (Edge Functions). En Supabase se almacenan los datos de perfil, cuenta, contenido publicado, relaciones sociales, mensajería de shares, denuncias, bloqueos, eventos de IA, presencia y avatares e imágenes de publicaciones. Actúa como encargado del tratamiento.
Más información: https://supabase.com/privacy
6.2 Railway
Railway (Railway Corp.) aloja nuestra API propia (FastAPI), que gestiona la racha de uso, el registro de usos diarios, los debates con el asistente de IA, la clasificación filosófica y el perfil filosófico ampliado. Actúa como encargado del tratamiento.
Política de privacidad: https://railway.app/legal/privacy
6.3 Apple
En dispositivos iOS, Apple gestiona el flujo de autenticación «Sign in with Apple», las APIs de reconocimiento de voz del sistema y la entrega de notificaciones push (APNs). Apple actúa como responsable independiente de los datos que gestiona en su plataforma.
Política de privacidad: https://www.apple.com/es/legal/privacy/
6.4 Google
Si inicia sesión con Google, el proceso de autenticación OAuth involucra a Google LLC. Google también gestiona la entrega de notificaciones push en Android (FCM) y las APIs de reconocimiento de voz del sistema en Android. Google actúa como responsable independiente.
Política de privacidad: https://policies.google.com/privacy
6.5 Meta (Facebook)
Si inicia sesión con Facebook, el proceso de autenticación OAuth involucra a Meta Platforms, Inc. Meta actúa como responsable independiente.
Política de privacidad: https://www.facebook.com/privacy/policy/
6.6 Expo
La aplicación está desarrollada con Expo (React Native). Expo gestiona la infraestructura de tokens y entrega de notificaciones push (Expo Push Notifications) y puede recopilar datos técnicos mínimos relacionados con el funcionamiento de la plataforma de desarrollo. Actúa como encargado del tratamiento en lo relativo a las notificaciones push.
Política de privacidad: https://expo.dev/privacy
6.7 OpenAI
OpenAI, LLC procesa, como subencargado del tratamiento, los textos que usted envía al asistente de inteligencia artificial en los debates y los textos utilizados para la generación del perfil filosófico ampliado. La integración se realiza a través de nuestra API propia (FastAPI / Railway), y la clave de la API de OpenAI permanece en nuestros servidores en todo momento.
Política de privacidad: https://openai.com/policies/privacy-policy
6.8 Anthropic
Anthropic, PBC procesa, como subencargado del tratamiento, los textos enviados para la clasificación filosófica (modelo Claude Haiku) y, en su caso, para la generación del perfil filosófico ampliado. La integración se realiza a través de nuestra API propia (FastAPI / Railway), y la clave de la API permanece en nuestros servidores en todo momento.
Política de privacidad: https://www.anthropic.com/legal/privacy
6.9 Amazon Web Services (AWS Rekognition)
Amazon Web Services, Inc. proporciona el servicio Rekognition utilizado para la moderación automática de imágenes (avatares y publicaciones). Las imágenes se envían a Rekognition desde nuestra Edge Function en Supabase (moderate-image) para detectar contenido inapropiado. AWS actúa como subencargado del tratamiento.
Política de privacidad: https://aws.amazon.com/es/privacy/
6.10 Sistema operativo del dispositivo (reconocimiento de voz)
El reconocimiento de voz utiliza las APIs nativas del sistema operativo (expo-speech-recognition): Apple Speech Framework en iOS y Android Speech Recognition en Android. Apple y Google son responsables independientes del tratamiento que puedan realizar en el marco de sus servicios de reconocimiento de voz del sistema.
6.11 Monitorización de errores (futura)
Actualmente la aplicación no cuenta con monitorización activa de errores en cliente mediante servicios externos. Si en el futuro activásemos un servicio de este tipo (por ejemplo, Sentry), actualizaríamos esta política con anterioridad a su entrada en funcionamiento.
No vendemos sus datos personales a terceros, no los compartimos con fines publicitarios y no integramos SDKs publicitarios o de seguimiento comportamental entre aplicaciones.

7. Transferencias internacionales
Algunos de los proveedores mencionados pueden almacenar o procesar datos fuera del Espacio Económico Europeo (EEE), principalmente en Estados Unidos. En concreto:
Supabase, Railway, OpenAI, Anthropic, Amazon Web Services, Expo, Apple, Google y Meta tienen infraestructura o sede social en Estados Unidos y pueden realizar tratamientos en dicho país.
Estas transferencias internacionales se amparan en mecanismos adecuados conforme al RGPD, como:
Las Cláusulas Contractuales Tipo adoptadas por la Comisión Europea.
El Marco de Privacidad de Datos UE-EE.UU. (Data Privacy Framework), cuando el proveedor esté certificado.
Otras garantías equivalentes reconocidas por la normativa vigente.
Le recomendamos consultar las políticas de privacidad de cada proveedor para conocer los detalles concretos de sus transferencias internacionales y los mecanismos de garantía aplicables.

8. Menores de edad
Evo es un servicio dirigido a personas mayores de 16 años en el ámbito de la Unión Europea (y mayores de 13 años en otras jurisdicciones que admitan dicha edad mínima, como determinados estados de EE. UU.).
Dado que la aplicación incluye contenido generado por usuarios, funciones sociales y mensajería de reenvío entre amigos mutuos, hemos adoptado las siguientes medidas:
Las imágenes (avatares e imágenes en publicaciones) se someten a moderación automática estricta mediante AWS Rekognition antes de su publicación.
La aplicación no permite mensajería de texto libre entre usuarios.
Mantenemos sistemas de bloqueo y denuncia accesibles desde la aplicación.
No recogemos conscientemente datos de menores que no cumplan el umbral de edad aplicable. Si usted es padre, madre o tutor/a y tiene conocimiento de que un menor a su cargo ha creado una cuenta o proporcionado datos sin la autorización correspondiente, le rogamos que contacte con nosotros en la dirección indicada en el apartado 11 para que podamos proceder a la eliminación de la cuenta y de los datos asociados.
La supervisión parental del uso de la aplicación por parte de menores es responsabilidad de los progenitores o tutores legales.

9. Cookies y almacenamiento local
Evo es una aplicación móvil nativa y no utiliza cookies en el sentido tradicional de las páginas web.
El almacenamiento local de datos en el dispositivo se realiza mediante los siguientes mecanismos:
AsyncStorage: almacenamiento local de React Native/Expo empleado para mantener tokens de sesión, preferencias de la aplicación, estado de clasificación y notificaciones in-app. Es intrínseco al funcionamiento del servicio y no se emplea con fines de rastreo entre aplicaciones o sitios web.
SecureStore: almacenamiento cifrado de la plataforma Expo/React Native utilizado para guardar de forma segura credenciales temporales durante el proceso de verificación de correo electrónico.
App Group UserDefaults (iOS) y almacenamiento del widget (Android): empleados por los widgets para mostrar la frase del día o el estado de su racha.
La aplicación no integra SDKs publicitarios, ni SDKs de analítica con fines publicitarios, ni mecanismos de seguimiento comportamental entre aplicaciones. Tampoco realiza actualmente monitorización de errores mediante servicios externos en cliente.
Si en el futuro incorporásemos herramientas adicionales de medición de rendimiento, análisis de uso o monitorización de errores, actualizaríamos esta política con anterioridad a su implementación.

10. Sus derechos en materia de protección de datos
De acuerdo con el RGPD y la LOPDGDD, usted puede ejercer los siguientes derechos respecto a sus datos personales:
Derecho de acceso (art. 15 RGPD): conocer qué datos suyos tratamos y obtener una copia.
Derecho de rectificación (art. 16 RGPD): solicitar la corrección de datos inexactos o incompletos.
Derecho de supresión, «derecho al olvido» (art. 17 RGPD): solicitar la eliminación de sus datos cuando, entre otros motivos, ya no sean necesarios para los fines para los que fueron recogidos.
Derecho a la limitación del tratamiento (art. 18 RGPD): solicitar que suspendamos el tratamiento de sus datos en determinadas circunstancias.
Derecho a la portabilidad (art. 20 RGPD): recibir sus datos en un formato estructurado, de uso común y lectura mecánica.
Derecho de oposición (art. 21 RGPD): oponerse al tratamiento de sus datos cuando este se base en el interés legítimo.
Derecho a no ser objeto de decisiones automatizadas (art. 22 RGPD): no ser sometido a decisiones basadas únicamente en el tratamiento automatizado que produzcan efectos jurídicos o significativos. Como se indica en el apartado 4, puede solicitar revisión humana de la asignación de clan y de la moderación automática de imágenes.
Derecho a retirar el consentimiento: cuando el tratamiento se base en su consentimiento (permisos de micrófono, cámara, fotos, notificaciones push), puede retirarlo en cualquier momento sin que ello afecte a la licitud del tratamiento previo.
Medios in-app para ejercer sus derechos:
Sin perjuicio del derecho a contactar directamente con nosotros, la aplicación incluye en el menú de Ajustes dos funcionalidades específicas:
«Descargar mis datos»: genera y le entrega un archivo en formato JSON con los datos asociados a su cuenta, incluidos: datos de cuenta, perfil, publicaciones, relaciones de seguimiento (following / followers), publicaciones guardadas, votos, usuarios bloqueados, denuncias, notificaciones y preferencias locales. Esta función facilita el ejercicio práctico de los derechos de acceso y portabilidad.
«Eliminar cuenta»: ejecuta la eliminación de su perfil, invocando una función segura (delete_user) sobre el sistema de autenticación, cerrando sesión y limpiando los datos locales (AsyncStorage). Esta función facilita el ejercicio práctico del derecho de supresión.
Para ejercer cualquier otro derecho, o si tiene dudas sobre el funcionamiento de las opciones in-app, puede dirigirse a la dirección de contacto indicada en el apartado 11. Responderemos en los plazos establecidos por la normativa (en general, en el plazo de un mes desde la recepción de la solicitud, prorrogable hasta dos meses adicionales en casos de especial complejidad).

11. Contacto y responsable del tratamiento
Responsable del tratamiento: EvoConn
Correo electrónico de contacto para protección de datos: hello@evoconn.com
Para cualquier consulta, solicitud de ejercicio de derechos o reclamación relativa al tratamiento de sus datos, puede dirigirse a la dirección de correo electrónico anterior indicando en el asunto: «Protección de Datos – Evo».

12. Derecho a reclamar ante la autoridad de control
Si considera que el tratamiento de sus datos personales vulnera la normativa aplicable, tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD), la autoridad de control competente en España:
Sitio web: https://www.aepd.es
Sede electrónica: https://sedeagpd.gob.es
Dirección postal: C/ Jorge Juan, 6 · 28001 Madrid
No obstante, le animamos a que, antes de presentar una reclamación ante la AEPD, nos contacte directamente para intentar resolver cualquier discrepancia de forma amistosa.

13. Modificaciones de esta Política de Privacidad
Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas, en la normativa aplicable o en las funcionalidades de la aplicación. Cuando realicemos cambios relevantes, le notificaremos a través de la propia aplicación o por otros medios adecuados, y actualizaremos la fecha de «Última actualización» que figura al inicio de este documento. Le recomendamos revisar esta política periódicamente.

EvoConn · com.evoconn.evo · hello@evoconn.com
`.trim();
