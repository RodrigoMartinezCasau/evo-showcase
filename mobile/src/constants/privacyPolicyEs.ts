/**
 * Política de privacidad (ES) — misma versión que App Store Connect / URL pública.
 * Última actualización: 18 de mayo de 2026.
 */
export const PRIVACY_POLICY_FULL_ES = `
POLÍTICA DE PRIVACIDAD
Aplicación Evo · com.evoconn.evo
Desarrollada y operada por EvoConn (cuenta de desarrollador: evoconn)
Última actualización: 18 de mayo de 2026

1. Introducción
Bienvenido/a a Evo, una aplicación móvil de carácter social y filosófico que permite compartir reflexiones, explorar frases, seguir a otros usuarios, participar en debates guiados por inteligencia artificial y descubrir contenido filosófico adaptado a tu perfil. EvoConn («nosotros», «el responsable») es el responsable del tratamiento de sus datos personales en los términos descritos en esta Política de Privacidad.
Esta política se redacta conforme al Reglamento (UE) 2016/679 General de Protección de Datos (RGPD), la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD) y la legislación complementaria aplicable en España. Le rogamos que la lea detenidamente antes de utilizar la aplicación.

2. Datos personales que recogemos
2.1 Datos de cuenta y perfil
Cuando crea una cuenta en Evo, recogemos y almacenamos en nuestra infraestructura de backend (Supabase) los siguientes datos:
Identificador de usuario único (UUID) generado por el sistema de autenticación.
Nombre de usuario (@usuario) elegido por usted.
Dirección de correo electrónico, cuando el método de registro así lo proporciona.
Número de teléfono, cuando opta por el registro mediante SMS/OTP.
Clan o corriente filosófica asignada según sus preferencias e interacciones.
Rango dentro de la aplicación.
Frase o lema de insignia personal.
Contadores de actividad: número de reflexiones publicadas, frases utilizadas y otros indicadores de uso.
Racha de uso (días consecutivos de actividad).
Usos restantes disponibles en el período actual.
Frases o contenidos desbloqueados.
Indicador de cuenta privada (is_private): si ha configurado su cuenta como privada, sus publicaciones y perfil solo serán accesibles para seguidores aprobados.
URL del avatar de perfil: la imagen de perfil que suba se almacena en Supabase Storage (servicio de almacenamiento en la nube de Supabase) y se referencia mediante una URL en su perfil.
Fecha de creación de la cuenta.

2.2 Datos de autenticación
La aplicación utiliza Supabase Auth como sistema de autenticación. Según el método de inicio de sesión que elija:
Apple Sign In (iOS): el flujo nativo de Apple gestiona la autenticación. Podemos recibir un identificador único de Apple y, opcionalmente, una dirección de correo electrónico (Apple puede proporcionar una dirección anonimizada si usted así lo prefiere al configurar su cuenta de Apple).
Google OAuth: autenticación mediante cuenta de Google a través del servicio OAuth de Supabase. Recibimos los datos básicos de perfil que Google comparte en este flujo (habitualmente correo electrónico e identificador de Google).
Facebook OAuth: autenticación mediante cuenta de Facebook/Meta a través del servicio OAuth de Supabase. Recibimos los datos básicos que Facebook comparte en este flujo (habitualmente correo electrónico e identificador de Facebook).
Correo electrónico y contraseña: registro y autenticación directos gestionados por Supabase Auth. Durante el proceso de verificación del correo electrónico, las credenciales temporales de verificación se almacenan de forma cifrada en el dispositivo mediante SecureStore (almacenamiento seguro cifrado de la plataforma Expo/React Native) hasta que el correo queda confirmado.
Número de teléfono (SMS/OTP): registro y autenticación mediante un código de un solo uso enviado por SMS, gestionado por Supabase Auth.

Los tokens de sesión y credenciales de autenticación se almacenan de forma local en el dispositivo mediante AsyncStorage, el mecanismo de almacenamiento local de la plataforma React Native/Expo. Esto permite mantener la sesión activa sin necesidad de volver a autenticarse en cada uso.

2.3 Contenido generado por el usuario
La aplicación permite crear y compartir reflexiones, participar en debates con asistente de inteligencia artificial, publicar frases filosóficas y dejar comentarios en publicaciones de otros usuarios. El texto que usted redacta o dicta y decide enviar o publicar puede almacenarse en nuestro backend (Supabase) para su funcionamiento. El contenido que permanezca únicamente en el dispositivo y no se envíe al servidor no es accesible por nosotros.
Las funciones sociales de la aplicación incluyen: publicación en el feed «Para ti» y «Siguiendo», sistema de seguir/dejar de seguir a otros usuarios, solicitudes de seguimiento en cuentas privadas, comentarios en publicaciones y debates con asistente de IA. Los datos asociados a estas interacciones (relaciones de seguimiento, comentarios, solicitudes) se almacenan en Supabase.
Los textos de los debates con IA que usted decide enviar se procesan a través de nuestra API propia para generar las respuestas del asistente. Estos eventos de uso de IA se registran en la tabla ai_usage_events de Supabase con fines de control de límites y mejora del servicio.

2.4 Fotos y avatar de perfil
La aplicación permite seleccionar una imagen desde la galería o la cámara del dispositivo para establecerla como foto de perfil. Para ello:
En iOS, se declaran los permisos de acceso a la biblioteca de fotos y, si usted lo elige, a la cámara.
En Android, se solicitan los permisos de acceso a la galería y/o cámara según la versión del sistema operativo.
El acceso solo se produce si usted otorga el permiso correspondiente y realiza la acción de selección o captura de imagen. La imagen seleccionada se sube y almacena en Supabase Storage, quedando referenciada mediante una URL en su perfil. Puede revocar estos permisos desde los ajustes del dispositivo, aunque ello impedirá cambiar la foto de perfil desde la aplicación.

2.5 Datos de uso y estadísticas
La aplicación registra datos relacionados con su actividad para proporcionar las funcionalidades descritas. Distinguimos dos flujos:
Supabase: registra datos de presencia de la aplicación (tabla user_app_presence) y eventos de uso de la IA (tabla ai_usage_events).
API FastAPI (Railway): gestiona el registro de usos diarios (/uses-log), datos de racha (/streak) y otros flujos de backend relacionados con el control de límites y estadísticas de actividad.

2.6 Datos de voz y transcripción (micrófono)
Evo permite dictar reflexiones por voz para convertirlas en texto. Para ello, la aplicación solicita permiso de acceso al micrófono del dispositivo (RECORD_AUDIO en Android; permiso de micrófono en iOS).
Aspectos relevantes sobre este tratamiento:
El reconocimiento de voz se realiza mediante las capacidades nativas del propio sistema operativo del dispositivo (expo-speech-recognition), configurado en idioma español (es-ES).
El audio captado se procesa localmente en el dispositivo para obtener la transcripción en texto. No enviamos el audio bruto a nuestros servidores.
El texto resultante de la transcripción solo se envía a nuestro backend si usted decide explícitamente publicar o enviar ese contenido.
Puede revocar el permiso de micrófono en cualquier momento desde los ajustes del dispositivo, aunque ello impedirá el uso de la función de dictado por voz.

2.7 Notificaciones push y locales
La aplicación puede enviarle notificaciones para informarle sobre actividad relacionada con su cuenta:
Notificaciones push remotas: generamos y almacenamos un token Expo Push asociado a su perfil en Supabase (campo push_token de la tabla profiles). Las notificaciones push informan sobre nuevos seguidores, solicitudes de seguimiento pendientes y comentarios en sus publicaciones. No se utilizan con fines publicitarios de terceros.
Notificaciones locales de racha: la aplicación puede programar recordatorios locales en su dispositivo para animarle a mantener su racha de uso diario. Estas notificaciones se generan directamente en el dispositivo, sin intervención de servidores externos.
Puede gestionar sus preferencias de notificaciones desde los ajustes del dispositivo y/o desde la propia aplicación.

2.8 Datos procesados localmente en el dispositivo
Parte del análisis del contenido textual para la asignación de clan filosófico se realiza mediante algoritmos locales en el propio dispositivo, sin enviar cada reflexión a servicios externos exclusivamente para ese propósito. Algunos textos pueden enviarse a nuestra API para clasificación asistida por IA cuando usted utiliza esas funciones. Algunos datos de estado y preferencias pueden almacenarse temporalmente en el dispositivo mediante AsyncStorage o SecureStore.

3. Finalidades del tratamiento
Tratamos sus datos para las siguientes finalidades:
Prestación del servicio: crear y gestionar su cuenta, permitir la autenticación, mostrar su perfil, asignar clan filosófico, calcular rachas y gestionar límites de uso.
Funciones sociales: publicar reflexiones en el feed, permitir el sistema de seguimiento entre usuarios, gestionar cuentas privadas y solicitudes de seguimiento, y mostrar comentarios.
Debates con asistencia de inteligencia artificial: procesar los textos que envía para generar respuestas del asistente y registrar eventos de uso de IA con fines de control de límites.
Transcripción de voz: convertir su voz en texto para facilitar la creación de contenido mediante dictado.
Personalización: adaptar su experiencia según su clan asignado y perfil filosófico.
Notificaciones: enviarle comunicaciones sobre actividad relevante en su cuenta y recordatorios de racha, sin fines publicitarios de terceros.
Foto de perfil: permitirle personalizar su perfil mediante una imagen almacenada en la nube.
Mantenimiento, seguridad y diagnóstico de errores: verificar el correcto funcionamiento del servicio, detectar usos fraudulentos, garantizar la integridad del sistema y diagnosticar fallos técnicos mediante Sentry.
Mejora del producto: analizar datos de uso agregados o anonimizados para mejorar las funcionalidades de la aplicación.

4. Base legal del tratamiento (art. 6 RGPD)
El tratamiento de sus datos se sustenta en las siguientes bases jurídicas previstas en el artículo 6 del RGPD:
Ejecución de un contrato (art. 6.1.b RGPD): el tratamiento es necesario para la prestación del servicio que usted solicita al crear una cuenta y utilizar la aplicación Evo. Abarca la gestión de cuenta, autenticación, funciones sociales, debates con IA, racha y límites de uso.
Interés legítimo (art. 6.1.f RGPD): para el mantenimiento de la seguridad del servicio, la prevención del abuso, el diagnóstico de errores técnicos (Sentry) y la mejora técnica del producto, siempre que no prevalezcan sus derechos y libertades fundamentales.
Consentimiento (art. 6.1.a RGPD): para el acceso al micrófono, a la biblioteca de fotos, a la cámara y el envío de notificaciones push, cuyos permisos se solicitan expresamente al usuario en el momento en que se requieren. Puede retirar este consentimiento en cualquier momento desde los ajustes del dispositivo, sin que ello afecte a la licitud del tratamiento anterior.

5. Plazos de conservación
Conservamos sus datos personales durante el tiempo necesario para cumplir las finalidades descritas:
Datos de cuenta y perfil: mientras su cuenta esté activa. Una vez que solicite la eliminación de la cuenta, procederemos a suprimir o anonimizar sus datos en un plazo razonable, salvo que exista obligación legal de conservación.
Datos de autenticación y sesión: los tokens almacenados localmente en el dispositivo (AsyncStorage, SecureStore) se eliminan al cerrar sesión o desinstalar la aplicación.
Contenido publicado: se conserva mientras el contenido esté activo en el servicio o hasta que usted solicite su eliminación.
Avatar en Supabase Storage: se elimina cuando usted cambia la imagen de perfil o solicita la supresión de su cuenta.
Token push: se conserva mientras la cuenta esté activa o hasta que se desactive la función de notificaciones.
Registros de uso y estadísticas: según las necesidades operativas del servicio; los datos agregados o anonimizados pueden conservarse por más tiempo.
Registros de errores (Sentry): conforme a los plazos establecidos en la política de retención de Sentry (habitualmente 90 días para eventos de error); pueden contener datos técnicos del dispositivo.

6. Destinatarios y terceros
Para prestar el servicio utilizamos los siguientes proveedores externos, que pueden actuar como encargados del tratamiento o como responsables independientes según el caso:

6.1 Supabase
Supabase (Supabase Inc.) proporciona la infraestructura de autenticación, base de datos relacional y almacenamiento en la nube donde se almacenan los datos de perfil, cuenta, contenido publicado, relaciones sociales (follows), notificaciones, presencia, eventos de IA y avatares de usuario. Los datos se almacenan en los servidores de Supabase, que puede alojarlos en distintas regiones.
Más información: https://supabase.com/privacy

6.2 Apple
En dispositivos iOS, Apple gestiona el flujo de autenticación «Sign in with Apple» de forma nativa y proporciona las APIs de reconocimiento de voz del sistema. Apple actúa como responsable independiente de los datos que gestiona en su plataforma.
Política de privacidad de Apple: https://www.apple.com/es/legal/privacy/

6.3 Google
Si inicia sesión con Google, el proceso de autenticación OAuth involucra a Google LLC. Google también puede ser responsable de las APIs de reconocimiento de voz del sistema en dispositivos Android. Google actúa como responsable independiente de los datos que gestiona en su plataforma.
Política de privacidad de Google: https://policies.google.com/privacy

6.4 Meta (Facebook)
Si inicia sesión con Facebook, el proceso de autenticación OAuth involucra a Meta Platforms, Inc. Meta actúa como responsable independiente de los datos que gestiona en su plataforma.
Política de privacidad de Meta: https://www.facebook.com/privacy/policy/

6.5 Railway (API propia / backend FastAPI)
Nuestro backend propio (API FastAPI) está alojado en Railway (Railway Corp.), proveedor de infraestructura en la nube. Railway puede tener acceso técnico a los datos procesados en nuestros servidores en su calidad de encargado del tratamiento. A través de esta API se gestionan, entre otros flujos, la racha de uso, el registro de usos diarios y los debates con el asistente de inteligencia artificial.
Política de privacidad de Railway: https://railway.app/legal/privacy

6.6 Expo (plataforma de desarrollo)
La aplicación está desarrollada con Expo (React Native / managed workflow). Expo puede recopilar datos técnicos mínimos relacionados con el funcionamiento de la plataforma de desarrollo, así como gestionar la infraestructura de tokens para notificaciones push (Expo Push Notifications).
Política de privacidad de Expo: https://expo.dev/privacy

6.7 Sistema operativo del dispositivo (reconocimiento de voz)
El reconocimiento de voz utiliza las APIs nativas del sistema operativo (expo-speech-recognition): Apple Speech Framework en iOS y Android Speech Recognition en Android. Apple y Google/Android son responsables independientes del tratamiento que puedan realizar en el marco de sus servicios de reconocimiento de voz del sistema.

6.8 Sentry (monitorización de errores)
La aplicación integra Sentry (Sentry.io) para la monitorización de errores y el diagnóstico del rendimiento. Sentry puede recopilar información técnica sobre los errores producidos en la aplicación, como tipo de error, traza de la pila, versión de la aplicación, tipo y versión del sistema operativo y, en su caso, datos técnicos del dispositivo. Asociamos los eventos al identificador de usuario de la cuenta solo para diagnosticar incidencias; no enviamos correo ni nombre a Sentry por defecto. Esta información se utiliza exclusivamente para detectar y corregir errores técnicos, y no con fines publicitarios ni de rastreo entre aplicaciones. Nuestro proyecto de Sentry está configurado con almacenamiento de datos en la Unión Europea.
Política de privacidad de Sentry: https://sentry.io/privacy/

No vendemos sus datos personales a terceros ni los compartimos con fines publicitarios propios de terceros. No integramos SDKs de publicidad ni de rastreo entre aplicaciones.

7. Transferencias internacionales
Algunos de los proveedores mencionados (Supabase, Google, Apple, Meta, Railway, Sentry) pueden almacenar o procesar datos fuera del Espacio Económico Europeo (EEE). En tales casos, las transferencias se amparan en mecanismos adecuados conforme al RGPD, como las Cláusulas Contractuales Tipo adoptadas por la Comisión Europea, el Marco de Privacidad de Datos UE-EE.UU. (Data Privacy Framework, cuando aplique), u otras garantías equivalentes reconocidas por la normativa vigente. Le recomendamos consultar las políticas de privacidad de cada proveedor para conocer los detalles de sus transferencias internacionales.

8. Menores de edad
Evo es un servicio dirigido a personas mayores de 16 años en el ámbito de la Unión Europea (y mayores de 13 años en otras jurisdicciones donde sea aplicable una edad mínima inferior, como determinados estados de EE.UU.). Dado que la aplicación incluye contenido generado por usuarios y funciones sociales, la supervisión parental del uso de la aplicación por parte de menores es responsabilidad de los progenitores o tutores legales.
No recogemos conscientemente datos de menores que no cumplan el umbral de edad aplicable. Si usted es padre, madre o tutor/a y tiene conocimiento de que un menor a su cargo ha creado una cuenta o proporcionado datos sin la autorización correspondiente, le rogamos que contacte con nosotros en la dirección indicada en el apartado 11 para que podamos proceder a la eliminación de dicha cuenta y sus datos.

9. Cookies y almacenamiento local
Evo es una aplicación móvil nativa y no utiliza cookies en el sentido tradicional de las páginas web.
El almacenamiento local de datos en el dispositivo se realiza mediante los siguientes mecanismos:
AsyncStorage: almacenamiento local de React Native/Expo utilizado para mantener tokens de sesión y preferencias de la aplicación. Es intrínseco al funcionamiento del servicio y no se emplea con fines de rastreo entre aplicaciones o sitios web.
SecureStore: almacenamiento cifrado de la plataforma Expo/React Native empleado para guardar de forma segura credenciales temporales durante el proceso de verificación de correo electrónico. Los datos se cifran y almacenan exclusivamente en el dispositivo del usuario.
Sentry: la aplicación integra el SDK de Sentry para el diagnóstico de errores técnicos. Sentry puede almacenar identificadores técnicos de sesión y de usuario (identificador de cuenta) con fines exclusivos de diagnóstico, no con fines publicitarios ni de seguimiento comportamental entre aplicaciones.
Si en el futuro incorporásemos herramientas de medición de rendimiento o análisis de uso adicionales que requiriesen actualizar esta política, lo haríamos con anterioridad a su implementación e informaríamos a los usuarios según proceda.

10. Sus derechos en materia de protección de datos
De acuerdo con el RGPD y la LOPDGDD, usted puede ejercer los siguientes derechos respecto a sus datos personales:
Derecho de acceso (art. 15 RGPD): conocer qué datos suyos tratamos y obtener una copia.
Derecho de rectificación (art. 16 RGPD): solicitar la corrección de datos inexactos o incompletos.
Derecho de supresión — «derecho al olvido» — (art. 17 RGPD): solicitar la eliminación de sus datos cuando, entre otros motivos, ya no sean necesarios para los fines para los que fueron recogidos.
Derecho a la limitación del tratamiento (art. 18 RGPD): solicitar que suspendamos el tratamiento de sus datos en determinadas circunstancias.
Derecho a la portabilidad (art. 20 RGPD): recibir sus datos en un formato estructurado, de uso común y lectura mecánica, y transmitirlos a otro responsable cuando el tratamiento se base en el consentimiento o en un contrato y se efectúe por medios automatizados.
Derecho de oposición (art. 21 RGPD): oponerse al tratamiento de sus datos cuando este se base en el interés legítimo.
Derecho a no ser objeto de decisiones automatizadas (art. 22 RGPD): no ser sometido a decisiones basadas únicamente en el tratamiento automatizado que produzcan efectos jurídicos o significativos sobre usted.
Derecho a retirar el consentimiento: cuando el tratamiento se base en su consentimiento (por ejemplo, permisos de micrófono, fotos o notificaciones push), puede retirarlo en cualquier momento sin que ello afecte a la licitud del tratamiento anterior a dicha retirada.

Desde la aplicación puede utilizar:
«Descargar mis datos» (Ajustes): genera un archivo JSON con la información de su cuenta que el servidor expone a su usuario.
«Eliminar cuenta» (Ajustes): solicita la supresión de su perfil y su usuario de autenticación según las capacidades del servidor.

Para ejercer cualquiera de estos derechos, diríjase a nosotros mediante la dirección de contacto indicada en el apartado 11. Responderemos en los plazos establecidos por la normativa (en general, en el plazo de un mes desde la recepción de la solicitud, prorrogable hasta dos meses adicionales en casos de especial complejidad).

11. Contacto y responsable del tratamiento
Responsable del tratamiento: EvoConn (desarrollador: evoconn)
Correo electrónico de contacto para protección de datos: hello@evoconn.com

Para cualquier consulta, solicitud de ejercicio de derechos o reclamación relativa al tratamiento de sus datos, puede dirigirse a la dirección anterior indicando en el asunto: «Protección de Datos – Evo».

12. Derecho a reclamar ante la autoridad de control
Si considera que el tratamiento de sus datos personales vulnera la normativa aplicable, tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD), la autoridad de control competente en España:
Sitio web: https://www.aepd.es
Sede electrónica / reclamaciones en línea: https://sedeagpd.gob.es
Dirección postal: Calle Jorge Juan, 6 · 28001 Madrid

No obstante, le animamos a que, antes de presentar una reclamación ante la AEPD, nos contacte directamente para intentar resolver cualquier discrepancia de forma amistosa.

13. Modificaciones de esta Política de Privacidad
Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas, en la normativa aplicable o en las funcionalidades de la aplicación. Cuando realicemos cambios relevantes, le notificaremos a través de la propia aplicación o por otros medios adecuados, y actualizaremos la fecha de «Última actualización» que figura al inicio de este documento. Le recomendamos revisar esta política periódicamente.

EvoConn · com.evoconn.evo · hello@evoconn.com
`.trim();
