import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateClinicalNote = async (rawNotes: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Actúa como un psicólogo clínico experto. Transforma las siguientes notas en bruto tomadas durante una sesión en una nota clínica formal y estructurada (Formato SOAP: Subjetivo, Objetivo, Análisis, Plan). Mantén un tono profesional, objetivo y conciso.
      
      Notas en bruto:
      ${rawNotes}`,
    });
    return response.text || "No se pudo generar la nota.";
  } catch (error) {
    console.error("Error generating note:", error);
    return "Error al contactar con el servicio de IA.";
  }
};

export const generateAppointmentReminder = async (patientName: string, date: string, time: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Genera un único mensaje de texto plano, corto, cercano y profesional para recordar una cita de psicología.
      El mensaje debe servir tanto para enviarse por WhatsApp como por Email (sin asuntos, ni firmas complejas).
      
      Datos:
      - Paciente: ${patientName}
      - Fecha: ${date}
      - Hora: ${time}
      
      Estructura deseada:
      "Hola [Nombre], le recordamos su cita para el [Fecha] a las [Hora]. Por favor, confirme su asistencia. En caso de no poder asistir, por favor comuníquelo lo antes posible. Un saludo."
      
      Adáptalo ligeramente para que suene natural pero mantén esa brevedad.`,
    });
    return response.text || "No se pudo generar el recordatorio.";
  } catch (error) {
    console.error("Error generating reminder:", error);
    return `Hola ${patientName}, le recordamos su cita para el ${date} a las ${time}.`;
  }
};

export const analyzeFinancialHealth = async (income: number, expense: number, trend: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Actúa como un asesor financiero para una clínica privada.
        Ingresos mes actual: ${income}€
        Gastos mes actual: ${expense}€
        Tendencia general: ${trend}
        
        Dame un breve análisis de 2 frases sobre la salud financiera y una recomendación.`,
      });
      return response.text || "Análisis no disponible.";
    } catch (error) {
      return "Error al analizar datos.";
    }
  };

export const analyzeReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: `Analiza esta imagen de un ticket o factura. Extrae los siguientes datos y devuélvelos estrictamente en formato JSON:
            - date: Fecha del ticket en formato YYYY-MM-DD. Si no hay año, asume el actual.
            - description: Nombre de la empresa o comercio y/o concepto principal.
            - amount: El importe total (número).
            - category: Infiere una categoría breve (ej: Material, Suministros, Comida, Transporte, Alquiler, Formación).
            - cif: El CIF o NIF de la empresa si es visible, sino string vacío.
            
            Responde SOLO con el JSON, sin bloques de código markdown.`
          }
        ]
      }
    });

    const text = response.text || "{}";
    // Clean markdown if present
    const jsonString = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    return null;
  }
};